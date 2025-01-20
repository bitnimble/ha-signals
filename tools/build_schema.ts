import { HassWebsocket } from 'api/websocket';
import 'dotenv/config';
import fs from 'fs';
import { globals } from 'globals';
import path from 'path';
import { EntityStore } from 'store';

global.WebSocket = require('ws');

const authHeaders = {
  'Authorization': `Bearer ${globals.authToken}`,
  'Content-Type': 'application/json',
};
class StringBuilder {
  private segments: string[] = [];

  add(s: string) {
    this.segments.push(s);
  }

  build() {
    return this.segments.join('');
  }
}

async function main() {
  const HASS_URL = process.env.HOME_ASSISTANT_URL;
  if (!HASS_URL || HASS_URL.trim() === '') {
    console.error(
      'Missing HOME_ASSISTANT_URL environment variable - have you set up your .env file?'
    );
    return;
  }

  const output = new StringBuilder();
  const domainIds = await processServices(output);
  await processEntities(output, domainIds);
  await processDevices(output);

  const outputPath = path.join(__dirname, '..', 'src/types/schema.ts');
  fs.writeFileSync(outputPath, output.build());
}

async function processServices(output: StringBuilder) {
  output.add('export type Domains = [\n');

  const domains: string[] = [];
  const domainIds: string[] = [];

  // TODO: TS types for this
  const hassServices = (await fetch(globals.hassUrl + '/api/services', {
    headers: authHeaders,
  }).then((r) => r.json())) as any[];

  // TODO: build ast instead of strings
  for (const domain of hassServices) {
    const domainId: string = domain.domain;
    const parsedServices: string[] = [];
    for (const [serviceId, _serviceDescriptor] of Object.entries(domain.services)) {
      const serviceDescriptor = _serviceDescriptor as any;
      const fields = processFields(serviceDescriptor.fields);
      const target = serviceDescriptor.target;
      let targetStr;
      if (target?.entity) {
        if (!Array.isArray(target.entity)) {
          // FIXME: DO NOT COMMIT
          console.log('Found non-array entity target for ' + serviceId);
          continue;
        }
        targetStr = target.entity
          .map((e: any) => (e.domain ? `Entities['${e.domain}']` : 'EntityId'))
          .join(' | ');
      } else if (target?.device) {
        // TODO: support "device" targets
        targetStr = 'string';
      } else {
        targetStr = 'never';
      }
      const serviceTsDocParts = {
        ['title']: serviceDescriptor.name,
        ['description']: serviceDescriptor.description,
      };
      parsedServices.push(
        `${createTsDocFromParts(serviceTsDocParts)}{
  id: '${serviceId}',
  target: ${targetStr},
  data: {
    ${fields.join(',\n')}
  },
}`
      );
    }

    domainIds.push(domainId);
    domains.push(`{
  id: '${domainId}',
  services: [
    ${parsedServices.join(',\n')}
  ],
}`);
  }
  output.add(domains.join(',\n'));
  output.add('\n];\n');
  output.add(`
export type DomainId = keyof Entities;
export type ServiceId = Domains[number]['services'][number]['id'];
export type Domain<D extends DomainId> = Extract<Domains[number], { id: D }>;
export type Service<D extends DomainId, S extends ServiceId> = Extract<Domain<D>['services'][number], { id: S }>;
`);

  return domainIds;
}

function processFields(fields: Record<string, any>): string[] {
  return [...Object.entries(fields)]
    .map(([fieldId, fieldDescriptor]: [string, any]) => {
      // Just pick the first valid selector for a field and roll with that
      // Use "Record<string, any> | null" as a pseudo "nullable any type" so we can do null
      // coalescing
      if (fieldId === 'advanced_fields') {
        return processFields(fieldDescriptor.fields).join(',\n');
      }
      const [selectorType, selectorMetadata]: [string, Record<string, any> | null] = [
        ...Object.entries(fieldDescriptor.selector),
      ][0] as [string, any];
      let fieldType: string | undefined;
      const isArray = !!selectorMetadata?.multiple;
      const tsDocParts: Record<string, string> = {
        ['title']: fieldDescriptor.name,
        ['description']: fieldDescriptor.description,
        ['example']: fieldDescriptor.example,
      };
      if (selectorType === 'text') {
        fieldType = 'string';
      } else if (selectorType === 'select') {
        fieldType = selectorMetadata!.options.map((o: string) => `'${o}'`).join(' | ');
      } else if (selectorType === 'boolean') {
        fieldType = 'boolean';
      } else if (selectorType === 'number' || selectorType === 'color_temp') {
        // TODO: statically typed ranges. for now, tsdoc
        if (selectorMetadata?.min != null || selectorMetadata?.max != null) {
          const min = selectorMetadata.min != null ? ` from ${selectorMetadata.min}` : '';
          const max =
            selectorMetadata.max != null ? ` up until ${selectorMetadata.max}` : ' onwards';
          const units = selectorMetadata.unit_of_measurement || selectorMetadata.unit;
          const unitsStr = units ? ` (${units})` : '';
          tsDocParts['type'] = `{number${isArray ? '[]' : ''}} A number${min}${max}${unitsStr}`;
        }
        fieldType = 'number';
      } else if (selectorType === 'object') {
        fieldType = 'object'; // Could be an array as well.
      } else if (selectorType === 'entity') {
        if (selectorMetadata?.domain) {
          // TODO: integration filtering as well (available on selectorMetadata.integration)
          fieldType = `Entities['${selectorMetadata.domain}']`;
        } else {
          fieldType = 'EntityId';
        }
      } else if (selectorType === 'time') {
        // TODO: statically typed times
        fieldType = 'string';
      } else if (selectorType === 'color_rgb') {
        fieldType = '[number, number, number]';
      } else if (selectorType === 'constant') {
        fieldType = selectorMetadata!.value;
      } else {
        // Skip unknown field types
        console.log(`Unknown field type "${selectorType}"!`);
        return null;
      }

      if (isArray) {
        fieldType = `(${fieldType})[]`;
      }
      const fieldOptional = !!fieldDescriptor.required ? '' : '?';

      return `${createTsDocFromParts(tsDocParts)}${fieldId}${fieldOptional}: ${fieldType}`;
    })
    .filter((s) => s != null);
}

function createTsDocFromParts(tsDocParts: Record<string, string>) {
  const validTsDocParts = [...Object.entries(tsDocParts)].filter(([_k, v]) => v != null);
  return validTsDocParts.length > 0
    ? `/**
${validTsDocParts.map(([k, v]) => ` * @${k} ${v}`).join('\n')}
 */
`
    : '';
}

async function processEntities(output: StringBuilder, domainIds: string[]) {
  const entities = (await fetch(globals.hassUrl + '/api/states', {
    headers: authHeaders,
  }).then((r) => r.json())) as {
    attributes: any;
    entity_id: string;
    last_changed: string;
    state: any;
  }[];

  const groupedEntities = entities.reduce((a, c) => {
    const domain = c.entity_id.substring(0, c.entity_id.indexOf('.'));
    const existing = a.get(domain);
    if (existing) {
      existing.push(c.entity_id);
    } else {
      a.set(domain, [c.entity_id]);
    }
    return a;
  }, new Map<string, string[]>());

  const domainIdsSet = new Set(domainIds);
  [...groupedEntities.keys()].forEach((d) => domainIdsSet.delete(d));

  output.add(`
export type Entities = {
  ${[...groupedEntities.entries()]
    .map(([domain, entities]) => `['${domain}']: ${entities.map((e) => `'${e}'`).join(' | ')},`)
    .join('\n')}
  ${[...domainIdsSet].map((d) => `['${d}']: never,`).join('\n')}
}

export type EntityId = Entities[keyof Entities];
`);
}

async function processDevices(output: StringBuilder) {
  const resp = (await fetch(globals.hassUrl + '/api/template', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      template: `
{% set devices = states | map(attribute='entity_id') | map('device_id') | unique | reject('eq', None) | list %}
{%- set ns = namespace(devices = []) %}
{%- for device in devices %}
  {%- set name = device_attr(device, 'name') %}
  {%- if name %}
    {%- set ns.devices = ns.devices + [ { "id": device, "name": name } ] %}
  {%- endif %}
{%- endfor %}
{{ ns.devices | tojson }}
`,
    }),
  }).then((r) => r.json())) as { id: string; name: string }[];

  const hassWs = new HassWebsocket(new EntityStore());
  await hassWs.connect();

  output.add(`export const Devices = {\n`);
  for (const device of resp) {
    const triggers = (await hassWs.getDeviceTriggers(device.id)) as {
      domain: string;
      type: string;
      subtype: string;
    }[];
    const mqttTriggers = triggers.filter((t) => t.domain === 'mqtt'); // Filter only mqtt triggers right now, we'll look at others later if we need them
    if (mqttTriggers.length === 0) {
      continue;
    }
    output.add(`
  ['${device.id}']: {
    name: '${device.name.replace("'", "\\'")}',
    triggers: [
      ${mqttTriggers.map((t) => `{ id: '${t.type}.${t.subtype}' },`).join('\n')}
    ]
  },`);
  }
  output.add(`
} as const;
export type DeviceName = typeof Devices[keyof typeof Devices]['name'];
export type DeviceTriggers<D extends DeviceName> = Extract<typeof Devices[keyof typeof Devices], { name: D }>['triggers'][number]['id'];
export const deviceNameMap = new Map([...Object.entries(Devices)].map(e => [e[1].name, e[0]]));
type UnionToIntersection<U> = (U extends any ? (x: U) => void : never) extends (x: infer I) => void
  ? I
  : never;
export type DomainForEntity = UnionToIntersection<
  {
    [Domain in keyof Entities]: {
      [EntityId in Entities[Domain]]: Domain;
    };
  }[keyof Entities]
>;
`);

  hassWs.close();
}

main();
