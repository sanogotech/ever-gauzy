import { DataSource } from 'typeorm';
import { IEmployee, IOrganization, ITenant } from '@gauzy/contracts';
import { faker } from '@ever-co/faker';
import * as moment from 'moment';
import { EmployeeAppointment } from './employee-appointment.entity';
import { AGENDAS } from './default-employee-appointment';
import { AppointmentEmployee } from './../core/entities/internal';

export const createDefaultEmployeeAppointment = async (
	dataSource: DataSource,
	tenant: ITenant,
	employees: IEmployee[],
	organizations
): Promise<EmployeeAppointment[]> => {
	if (!employees) {
		console.warn(
			'Warning: Employees not found, Default Employee Appointment  will not be created'
		);
		return;
	}
	if (!organizations) {
		console.warn(
			'Warning: tenantOrganizations not found, Default Employee Appointment  will not be created'
		);
		return;
	}

	let employeesAppointments: EmployeeAppointment[] = [];
	for (const employee of employees) {
		employeesAppointments = await dataOperation(
			dataSource,
			employeesAppointments,
			employee,
			[organizations],
			tenant
		);
	}
	await dataSource.manager.save(employeesAppointments);
};

export const createRandomEmployeeAppointment = async (
	dataSource: DataSource,
	tenants: ITenant[],
	tenantEmployeeMap: Map<ITenant, IEmployee[]>,
	tenantOrganizationsMap: Map<ITenant, IOrganization[]>
): Promise<EmployeeAppointment[]> => {
	if (!tenantEmployeeMap) {
		console.warn(
			'Warning: tenantEmployeeMap not found, Employee Appointment  will not be created'
		);
		return;
	}
	if (!tenantOrganizationsMap) {
		console.warn(
			'Warning: tenantOrganizationsMap not found, Employee Appointment  will not be created'
		);
		return;
	}

	let employeesAppointments: EmployeeAppointment[] = [];

	for (const tenant of tenants) {
		const tenantEmployees = tenantEmployeeMap.get(tenant);
		const tenantOrgs = tenantOrganizationsMap.get(tenant);

		for (const tenantEmployee of tenantEmployees) {
			employeesAppointments = await dataOperation(
				dataSource,
				employeesAppointments,
				tenantEmployee,
				tenantOrgs,
				tenant
			);
		}
	}
};

const dataOperation = async (
	dataSource: DataSource,
	employeesAppointments,
	tenantEmployee,
	organizations: IOrganization[],
	tenant: ITenant
) => {
	for (const organization of organizations) {
		const employeesAppointment = new EmployeeAppointment();

		const invitees = await dataSource.manager.find(AppointmentEmployee, {
			where: [{ employeeId: tenantEmployee.id }]
		});

		employeesAppointment.employee = tenantEmployee;
		employeesAppointment.organization = organization;
		employeesAppointment.description = faker.name.jobDescriptor();
		employeesAppointment.location = faker.address.city();
		employeesAppointment.startDateTime = faker.date.between(
			new Date(),
			moment(new Date()).add(2, 'months').toDate()
		);
		employeesAppointment.endDateTime = moment(
			employeesAppointment.startDateTime
		)
			.add(1, 'hours')
			.toDate();
		employeesAppointment.invitees = invitees;
		employeesAppointment.agenda = faker.random.arrayElement(AGENDAS);
		employeesAppointment.tenant = tenant;
		employeesAppointments.push(employeesAppointment);
	}

	await dataSource.manager.save(employeesAppointments);
	return employeesAppointments;
};
