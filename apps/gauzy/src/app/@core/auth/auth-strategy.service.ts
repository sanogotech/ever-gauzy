import { Observable, from, of, tap } from 'rxjs';
import { NbAuthResult, NbAuthStrategy } from '@nebular/auth';
import { ActivatedRoute } from '@angular/router';
import { catchError, map, switchMap } from 'rxjs/operators';
import { Injectable } from '@angular/core';
import { IUser, IAuthResponse } from '@gauzy/contracts';
import { isNotEmpty } from '@gauzy/common-angular';
import { NbAuthStrategyClass } from '@nebular/auth/auth.options';
import { AuthService } from '../services/auth.service';
import { Store } from '../services/store.service';
import { ElectronService } from 'ngx-electron';
import { TimeTrackerService } from '../../@shared/time-tracker/time-tracker.service';
import { TimesheetFilterService } from '../../@shared/timesheet/timesheet-filter.service';
import { CookieService } from 'ngx-cookie-service';
// tslint:disable-next-line: nx-enforce-module-boundaries

@Injectable()
export class AuthStrategy extends NbAuthStrategy {
	private static config = {
		login: {
			redirect: {
				success: '/',
				failure: null
			},
			defaultErrors: [
				'Login/Email combination is not correct, please try again.'
			],
			defaultMessages: ['You have been successfully logged in.']
		},
		register: {
			redirect: {
				success: '/',
				failure: null
			},
			defaultErrors: ['Something went wrong, please try again.'],
			defaultMessages: ['You have been successfully registered.']
		},
		logout: {
			redirect: {
				success: '/',
				failure: null
			},
			defaultErrors: ['Something went wrong, please try again.'],
			defaultMessages: ['You have been successfully logged out.']
		},
		requestPass: {
			redirect: {
				success: '/',
				failure: null
			},
			defaultErrors: ['Something went wrong, please try again.'],
			defaultMessages: [
				'Reset password instructions have been sent to your email.'
			]
		},
		resetPass: {
			redirect: {
				success: '/',
				failure: null
			},
			resetPasswordTokenKey: 'reset_password_token',
			defaultErrors: ['Password Reset Failed.'],
			defaultMessages: ['Your password has been successfully changed.']
		}
	};

	constructor(
		private readonly route: ActivatedRoute,
		private readonly authService: AuthService,
		private readonly store: Store,
		private readonly timeTrackerService: TimeTrackerService,
		private readonly timesheetFilterService: TimesheetFilterService,
		private readonly electronService: ElectronService,
		private readonly cookieService: CookieService
	) {
		super();
	}

	static setup(options: { name: string }): [NbAuthStrategyClass, any] {
		return [AuthStrategy, options];
	}

	authenticate(data?: any): Observable<NbAuthResult> {
		const { email, password } = data;
		return this.login({
			email,
			password
		}).pipe(
			tap(() => this.rememberMe(data))
		);
	}

	/**
	 * Integrate client side remember me feature
	 */
	rememberMe(data?: any) {
		const rememberMe = !!data.rememberMe;
		if (rememberMe) {
			this.cookieService.set('email', data.email);
			this.cookieService.set('rememberMe', 'true');
		} else {
			this.cookieService.delete('rememberMe');
			this.cookieService.delete('email');
		}
	}

	register(data?: any): Observable<NbAuthResult> {
		const {
			email,
			fullName,
			password,
			confirmPassword,
			tenant,
			tags
		} = data;

		if (password !== confirmPassword) {
			return of(
				new NbAuthResult(false, null, null, [
					"The passwords don't match."
				])
			);
		}

		const registerInput = {
			user: {
				firstName: fullName
					? fullName.split(' ').slice(0, -1).join(' ')
					: null,
				lastName: fullName
					? fullName.split(' ').slice(-1).join(' ')
					: null,
				email,
				tenant,
				tags
			},
			password,
			confirmPassword
		};
		return this.authService.register(registerInput).pipe(
			switchMap((res: IUser | any) => {
				if (res.status === 400) {
					throw new Error(res.message)
				}
				const user: IUser = res;
				if (isNotEmpty(user)) {
					return this.login({
						email,
						password
					});
				}
			}),
			catchError((err) => {
				console.log(err);
				return of(
					new NbAuthResult(
						false,
						err,
						false,
						AuthStrategy.config.register.defaultErrors,
						[AuthStrategy.config.register.defaultErrors]
					)
				);
			})
		);
	}

	logout(): Observable<NbAuthResult> {
		return from(this._logout());
	}

	/**
	 * Forgot password request strategy
	 *
	 * @param data
	 * @returns
	 */
	requestPassword(data?: any): Observable<NbAuthResult> {
		const { email } = data;
		return this.authService
			.requestPassword({
				email
			})
			.pipe(
				map((value: any) => {
					if (typeof(value) === 'boolean') {
						return new NbAuthResult(
							true,
							value,
							false,
							[],
							AuthStrategy.config.requestPass.defaultMessages
						);
					}
					return new NbAuthResult(
						false,
						value.response,
						false,
						value.message || AuthStrategy.config.requestPass.defaultErrors
					);
				}),
				catchError((error) => {
					return of(
						new NbAuthResult(
							false,
							error,
							false,
							AuthStrategy.config.requestPass.defaultErrors,
							[AuthStrategy.config.requestPass.defaultErrors]
						)
					);
				})
			);
	}

	resetPassword(data?: any): Observable<NbAuthResult> {
		const { password, confirmPassword } = data;
		const token = this.route.snapshot.queryParamMap.get('token');

		if (password !== confirmPassword) {
			return of(
				new NbAuthResult(false, null, null, [
					"The password and confirmation password do not match."
				])
			);
		}

		return this.authService.resetPassword({
			token,
			password,
			confirmPassword
		}).pipe(
			map((res: any) => {
				if (res.status === 400) {
					throw new Error(res.message)
				}
				return new NbAuthResult(
					true,
					res,
					AuthStrategy.config.resetPass.redirect.success,
					[],
					AuthStrategy.config.resetPass.defaultMessages
				);
			}),
			catchError((err) => {
				return of(
					new NbAuthResult(
						false,
						err,
						false,
						AuthStrategy.config.resetPass.defaultErrors,
						[AuthStrategy.config.resetPass.defaultErrors]
					)
				);
			})
		);
	}

	refreshToken(data?: any): Observable<NbAuthResult> {
		throw new Error('Not implemented yet');
	}

	private async _logout(): Promise<NbAuthResult> {
		await this._preLogout();

		this.store.clear();
		this.store.serverConnection = 200;
		if (this.electronService.isElectronApp) {
			try {
				this.electronService.ipcRenderer.send('logout');
			} catch (error) {}
		}

		return new NbAuthResult(
			true,
			null,
			AuthStrategy.config.logout.redirect.success,
			[],
			AuthStrategy.config.logout.defaultMessages
		);
	}

	private async _preLogout() {
		//remove time tracking/timesheet filter just before logout
		if (this.store.user && this.store.user.employeeId) {
			if (this.timeTrackerService.running) {
				this.timeTrackerService.toggle();
			}

			this.timeTrackerService.clearTimeTracker();
			this.timesheetFilterService.clear();
		}
	}

	public login(loginInput): Observable<NbAuthResult> {

		return this.authService.login(loginInput).pipe(
			map((res: IAuthResponse) => {
				let user, token, refresh_token;
				if (res) {
					user = res.user;
					token = res.token;
					refresh_token = res.refresh_token;
				}

				if (!user) {
					return new NbAuthResult(
						false,
						res,
						false,
						AuthStrategy.config.login.defaultErrors
					);
				}

				this.store.userId = user.id;
				this.store.token = token;
				this.store.refresh_token = refresh_token;

				this.electronAuthentication({ user, token });

				return new NbAuthResult(
					true,
					res,
					this.route.snapshot.queryParams['returnUrl'] || AuthStrategy.config.login.redirect.success,
					[],
					AuthStrategy.config.login.defaultMessages
				);
			}),
			catchError((err) => {
				console.log(err);
				return of(
					new NbAuthResult(
						false,
						err,
						false,
						AuthStrategy.config.login.defaultErrors,
						[AuthStrategy.config.login.defaultErrors]
					)
				);
			})
		);
	}

	public electronAuthentication({ user, token }: IAuthResponse) {
		try {
			if (this.electronService.isElectronApp) {
				this.electronService.ipcRenderer.send('auth_success', {
					token: token,
					userId: user.id,
					employeeId: user.employee ? user.employee.id : null,
					organizationId: user.employee
						? user.employee.organizationId
						: null,
					tenantId: user.tenantId ? user.tenantId : null
				});
			}
		} catch (error) {
			console.log(error);
		}
	}
}
