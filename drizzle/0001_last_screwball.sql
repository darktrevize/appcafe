CREATE TABLE `eliminaciones_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`eliminado_en` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`movimiento_id` integer NOT NULL,
	`movimiento_created_at` text NOT NULL,
	`tipo` text NOT NULL,
	`fecha` text NOT NULL,
	`numero_remito` text,
	`kg_verde` real,
	`bolsas` integer,
	`peso_bolsa_kg` real,
	`kg_tostado` real,
	`merma_pct_aplicada` real,
	`kg_verde_consumido` real,
	`notas` text
);
