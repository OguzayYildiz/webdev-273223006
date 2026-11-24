CREATE TABLE workstations (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  lab_id integer NOT NULL REFERENCES labs(id) ON DELETE RESTRICT,
  label text NOT NULL,
  UNIQUE (lab_id, label)
);

CREATE TABLE bookings (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  workstation_id integer NOT NULL REFERENCES workstations(id) ON DELETE RESTRICT,
  booked_on date NOT NULL CHECK (extract(isodow FROM booked_on) BETWEEN 1 AND 5),
  hour integer NOT NULL CHECK (hour BETWEEN 9 AND 16),
  CONSTRAINT one_booking_per_workstation_slot UNIQUE (workstation_id, booked_on, hour)
);

CREATE INDEX bookings_by_user ON bookings (user_id, booked_on, hour);
CREATE INDEX bookings_by_date ON bookings (booked_on, hour);
