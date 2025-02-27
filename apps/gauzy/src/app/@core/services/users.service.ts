import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { IUser, IUserFindInput, IUserUpdateInput } from '@gauzy/contracts';
import { toParams } from '@gauzy/common-angular';
import { API_PREFIX } from '../constants/app.constants';

@Injectable()
export class UsersService {
	constructor(private http: HttpClient) { }

	API_URL = `${API_PREFIX}/user`;

	getMe(relations?: string[]): Promise<IUser> {
		return firstValueFrom(
			this.http
			.get<IUser>(`${this.API_URL}/me`, {
				params: toParams({ relations })
			})
		);
	}

	getUserByEmail(emailId: string): Promise<IUser> {
		return firstValueFrom(
			this.http
			.get<IUser>(`${this.API_URL}/email/${emailId}`)
		);
	}

	getUserById(id: string, relations?: string[]): Promise<IUser> {
		const data = JSON.stringify({ relations });
		return firstValueFrom(
			this.http
			.get<IUser>(`${this.API_URL}/${id}`, {
				params: { data }
			})
		);
	}

	getAll(
		relations?: string[],
		findInput?: IUserFindInput
	): Promise<{ items: IUser[]; total: number }> {
		const data = JSON.stringify({ relations, findInput });
		return firstValueFrom(
			this.http
			.get<{ items: IUser[]; total: number }>(`${this.API_URL}`, {
				params: { data }
			})
		);
	}

	update(userId: string, updateInput: IUserUpdateInput) {
		return firstValueFrom(
			this.http
			.put(`${this.API_URL}/${userId}`, updateInput)
		);
	}

	delete(userId, user) {
		return firstValueFrom(
			this.http
			.delete(`${this.API_URL}/${userId}`, user)
		);
	}

	deleteAllData() {
		return firstValueFrom(
			this.http.delete(`${this.API_URL}/reset`)
		);
	}

	updatePreferredLanguage(input: IUserUpdateInput) {
		return firstValueFrom(
			this.http.put(`${this.API_URL}/preferred-language`, input)
		);
	}

	updatePreferredComponentLayout(input: IUserUpdateInput) {
		return firstValueFrom(
			this.http.put(`${this.API_URL}/preferred-layout`, input)
		);
	}
}
