import {
	Controller,
	Post,
	HttpStatus,
	HttpCode,
	Body,
	Get,
	Req,
	Query,
	UseInterceptors,
	UsePipes,
	ValidationPipe,
	UseGuards,
	BadRequestException
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiOkResponse, ApiBadRequestResponse } from '@nestjs/swagger';
import { CommandBus } from '@nestjs/cqrs';
import { Request } from 'express';
import { I18nLang } from 'nestjs-i18n';
import {
	IAuthResponse,
	LanguagesEnum
} from '@gauzy/contracts';
import { AuthService } from './auth.service';
import { User as IUser } from '../user/user.entity';
import { AuthLoginCommand, AuthRegisterCommand } from './commands';
import { RequestContext } from '../core/context';
import { TransformInterceptor } from './../core/interceptors';
import { Public } from './../shared/decorators';
import { AuthRefreshGuard } from './../shared/guards';
import { ChangePasswordRequestDTO, ResetPasswordRequestDTO } from './../password-reset/dto';
import { LoginUserDTO, RegisterUserDTO } from './../user/dto';
import { UserService } from './../user/user.service';
import { HasRoleQueryDTO, RefreshTokenDto } from './dto';

@ApiTags('Auth')
@UseInterceptors(TransformInterceptor)
@Controller()
export class AuthController {
	constructor(
		private readonly authService: AuthService,
		private readonly userService: UserService,
		private readonly commandBus: CommandBus
	) {}

	@ApiOperation({ summary: 'Check if user is authenticated' })

	@ApiOkResponse({ status: HttpStatus.OK, description:'The success server response' })
	@ApiBadRequestResponse({ status: HttpStatus.BAD_REQUEST, })
	@Get('/authenticated')
	@Public()
	async authenticated(): Promise<boolean> {
		const token = RequestContext.currentToken();
		return await this.authService.isAuthenticated(token);
	}

	@ApiOperation({ summary: 'Has role?' })
	@ApiResponse({ status: HttpStatus.OK })
	@ApiResponse({ status: HttpStatus.BAD_REQUEST })
	@Get('/role')
	@UsePipes(new ValidationPipe({ transform: true }))
	async hasRole(
		@Query() query: HasRoleQueryDTO
	): Promise<boolean> {
		return await this.authService.hasRole(query.roles);
	}

	@ApiOperation({ summary: 'Create new record' })
	@ApiResponse({
		status: HttpStatus.CREATED,
		description: 'The record has been successfully created.' /*, type: T*/
	})
	@ApiResponse({
		status: HttpStatus.BAD_REQUEST,
		description:
			'Invalid input, The response body may contain clues as to what went wrong'
	})
	@Post('/register')
	@Public()
	@UsePipes(new ValidationPipe({ transform: true }))
	async register(
		@Body() entity: RegisterUserDTO,
		@Req() request: Request,
		@I18nLang() languageCode: LanguagesEnum
	): Promise<IUser> {
		return await this.commandBus.execute(
			new AuthRegisterCommand({
				originalUrl: request.get('Origin'), ...entity },
				languageCode
			)
		);
	}

	@HttpCode(HttpStatus.OK)
	@Post('/login')
	@Public()
	@UsePipes(new ValidationPipe({ transform: true }))
	async login(
		@Body() entity: LoginUserDTO
	): Promise<IAuthResponse | null> {
		return await this.commandBus.execute(
			new AuthLoginCommand(entity)
		);
	}

	@Post('/reset-password')
	@Public()
	@UsePipes(new ValidationPipe({ transform: true }))
	async resetPassword(
		@Body() request: ChangePasswordRequestDTO
	) {
		return await this.authService.resetPassword(request);
	}

	@Post('/request-password')
	@Public()
	@UsePipes(new ValidationPipe({
		transform: true,
		whitelist: true
	}))
	async requestPassword(
		@Body() body: ResetPasswordRequestDTO,
		@Req() request: Request,
		@I18nLang() languageCode: LanguagesEnum
	): Promise<boolean | BadRequestException> {
		return await this.authService.requestPassword(
			body,
			languageCode,
			request.get('Origin')
		);
	}

	@HttpCode(HttpStatus.OK)
	@ApiOperation({ summary: 'Logout' })
	@Get('logout')
	async getLogOut() {
		return await this.userService.removeRefreshToken();
	}

	@HttpCode(HttpStatus.OK)
	@ApiOperation({ summary: 'Refresh token' })
	@Public()
	@UsePipes(new ValidationPipe({ transform: true }))
	@UseGuards(AuthRefreshGuard)
	@Post('/refresh-token')
	async refreshToken(
		@Body() body: RefreshTokenDto
	) {
		return await this.authService.getAccessTokenFromRefreshToken();
	}
}
