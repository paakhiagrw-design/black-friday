import path from "node:path";

export function databasePath() {
  return path.resolve(
    /* turbopackIgnore: true */ process.env.DATABASE_PATH ||
      path.join(
        process.env.RAILWAY_VOLUME_MOUNT_PATH ||
          path.join(process.cwd(), "database"),
        "reroute.db",
      ),
  );
}

export function uploadsDirectory() {
  return path.join(path.dirname(databasePath()), "store-uploads");
}
