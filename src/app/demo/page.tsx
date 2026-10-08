import { notFound } from "next/navigation";
import { Suspense } from "react";
import { TripScreen } from "@/components/trip/trip-screen";
import { withCityPhotos } from "@/lib/city-photo";
import { DEMO_MY_MEMBER_ID, DEMO_TRIP } from "@/lib/demo-trip";

// Pantalla del Viaje con el viaje de ejemplo, sin base ni login. Solo existe en desarrollo
// (en producción da 404) y sirve para ver y ajustar el diseño.
export default function DemoPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return (
    <Suspense fallback={<p className="p-5 text-[15px] text-ink-2">Cargando el viaje…</p>}>
      <DemoTrip />
    </Suspense>
  );
}

async function DemoTrip() {
  const trip = { ...DEMO_TRIP, stops: await withCityPhotos(DEMO_TRIP.stops) };
  return <TripScreen trip={trip} chipDisplay="time" myMemberId={DEMO_MY_MEMBER_ID} />;
}
