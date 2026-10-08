import { appIcon } from "@/lib/app-icon";

// Ícono del manifest. La carpeta lleva la extensión para que la URL sea /icon-192.png.
export function GET() {
  return appIcon(192);
}
