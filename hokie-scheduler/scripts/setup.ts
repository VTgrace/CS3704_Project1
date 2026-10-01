import { copyFile, chmod, constants } from "node:fs/promises";
try {
  await copyFile(".env.example", ".env", constants.COPYFILE_EXCL);
  await chmod(".env", 0o600);
  console.log(
    "Created private .env. Fill in credentials locally; never paste them into chat or commit this file.",
  );
} catch (error) {
  if ((error as NodeJS.ErrnoException).code === "EEXIST")
    console.log(".env already exists; preserved it unchanged.");
  else throw error;
}
