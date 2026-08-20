CREATE TABLE `configuracion` (
	`id` integer PRIMARY KEY NOT NULL,
	`merma_pct_default` real DEFAULT 17 NOT NULL,
	`peso_bolsa_default_kg` real DEFAULT 3 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `movimientos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tipo` text NOT NULL,
	`fecha` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`numero_remito` text,
	`kg_verde` real,
	`bolsas` integer,
	`peso_bolsa_kg` real,
	`kg_tostado` real,
	`merma_pct_aplicada` real,
	`kg_verde_consumido` real,
	`notas` text
);
