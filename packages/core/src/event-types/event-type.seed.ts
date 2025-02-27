import { DataSource } from 'typeorm';
import { IEmployee, IOrganization, ITenant } from '@gauzy/contracts';
import { faker } from '@ever-co/faker';
import { EventType, Tag } from './../core/entities/internal';

export const createRandomEventType = async (
	dataSource: DataSource,
	tenants: ITenant[],
	tenantEmployeeMap: Map<ITenant, IEmployee[]>,
	tenantOrganizationsMap: Map<ITenant, IOrganization[]>
): Promise<EventType[]> => {
	if (!tenantEmployeeMap) {
		console.warn(
			'Warning: tenantEmployeeMap not found, deal  will not be created'
		);
		return;
	}
	if (!tenantOrganizationsMap) {
		console.warn(
			'Warning: tenantOrganizationsMap not found, deal  will not be created'
		);
		return;
	}

	for (const tenant of tenants) {
		const tenantEmployees = tenantEmployeeMap.get(tenant);
		const organizations = tenantOrganizationsMap.get(tenant);
		for (const tenantEmployee of tenantEmployees) {
			const eventTypes: EventType[] = [];
			for (const organization of organizations) {
				const { id: organizationId } = organization;
				const tags = await dataSource.manager.findBy(Tag, {
					organizationId
				});
				const event = new EventType();
				event.isActive = faker.datatype.boolean();
				event.description = faker.name.jobDescriptor();
				event.title = faker.name.jobTitle();
				event.durationUnit = 'minutes';
				event.duration = faker.datatype.number(50);
				event.organization = organization;
				event.employee = tenantEmployee;
				event.tags = tags;
				event.tenant = tenant;
				eventTypes.push(event);
			}
			await dataSource.manager.save(eventTypes);
		}
	}
};

export const createDefaultEventTypes = async (
	dataSource: DataSource,
	tenant: ITenant,
	organizations: IOrganization[]
): Promise<EventType[]> => {
	const eventTypes: EventType[] = [];
	organizations.forEach((organization) => {
		const eventType = new EventType();
		eventType.title = '15 Minutes Event';
		eventType.description = 'This is a default event type.';
		eventType.duration = 15;
		eventType.durationUnit = 'Minute(s)';
		eventType.isActive = true;
		eventType.organization = organization;
		eventType.tenant = tenant;
		eventTypes.push(eventType);

		const eventTypeOne = new EventType();
		eventTypeOne.title = '30 Minutes Event';
		eventTypeOne.description = 'This is a default event type.';
		eventTypeOne.duration = 30;
		eventTypeOne.durationUnit = 'Minute(s)';
		eventTypeOne.isActive = true;
		eventTypeOne.organization = organization;
		eventTypeOne.tenant = tenant;
		eventTypes.push(eventTypeOne);

		const eventTypeTwo = new EventType();
		eventTypeTwo.title = '60 Minutes Event';
		eventTypeTwo.description = 'This is a default event type.';
		eventTypeTwo.duration = 60;
		eventTypeTwo.durationUnit = 'Minute(s)';
		eventTypeTwo.isActive = true;
		eventTypeTwo.organization = organization;
		eventTypeTwo.tenant = tenant;
		eventTypes.push(eventTypeTwo);
	});

	return await insertEventTypes(dataSource, eventTypes);
};

const insertEventTypes = async (
	dataSource: DataSource,
	eventTypes: EventType[]
): Promise<EventType[]> => {
	return await dataSource.manager.save(eventTypes);
};
