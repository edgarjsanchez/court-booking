// Creates the tables and loads the courts from src/seed.ts. Safe to re-run:
// existing bookings are kept and court details are updated.
import { COURTS, FACILITY } from "../src/seed";
import { env } from "./env";

if (!env.DATABASE_URL) {
  console.error("DATABASE_URL is missing. Add it to the .env file first (see README).");
  process.exit(1);
}

const { query } = await import("./db");
const { SCHEMA } = await import("./schema");

for (const statement of SCHEMA) await query(statement);
console.log("✓ Tables ready");

await query(
  `insert into facilities (id, name, address) values ($1, $2, $3)
   on conflict (id) do update set name = excluded.name, address = excluded.address`,
  [FACILITY.id, FACILITY.name, FACILITY.address],
);
for (const [i, c] of COURTS.entries()) {
  await query(
    `insert into courts (id, facility_id, name, surface, indoor, has_lights, sort_order)
     values ($1, $2, $3, $4, $5, $6, $7)
     on conflict (id) do update set facility_id = excluded.facility_id, name = excluded.name,
       surface = excluded.surface, indoor = excluded.indoor, has_lights = excluded.has_lights,
       sort_order = excluded.sort_order`,
    [c.id, c.facilityId, c.name, c.surface, c.indoor, c.hasLights, i],
  );
}
console.log(`✓ ${COURTS.length} courts at ${FACILITY.name}`);
