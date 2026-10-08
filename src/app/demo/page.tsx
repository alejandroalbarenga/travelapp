import { notFound } from "next/navigation";
import { TripScreen } from "@/components/trip/trip-screen";
import { DEMO_MY_MEMBER_ID, DEMO_TRIP } from "@/lib/demo-trip";

// Pantalla del Viaje con el viaje de ejemplo, sin base ni login. Solo existe en desarrollo
// (en producción da 404) y sirve para ver y ajustar el diseño.
export default function DemoPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <TripScreen trip={DEMO_TRIP} chipDisplay="time" myMemberId={DEMO_MY_MEMBER_ID} />;
}
