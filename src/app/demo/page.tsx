import { notFound } from "next/navigation";
import { Suspense } from "react";
import { TripScreen } from "@/components/trip/trip-screen";
import { withCityPhotos } from "@/lib/city-photo";
import { findPlaces } from "@/app/viaje/[id]/actions";
import { DEMO_MY_MEMBER_ID, DEMO_PERSONAL, DEMO_TRIP } from "@/lib/demo-trip";
import { LoadingScreen } from "@/components/loading-screen";

// Pantalla del Viaje con el viaje de ejemplo, sin base ni login. Solo existe en desarrollo
// (en producción da 404) y sirve para ver y ajustar el diseño.
// ?como=ro|jo|ag muestra la app como otro integrante (Rodrigo puede editar; Josué y Agustín solo ven).
// ?vacio muestra un viaje recién creado, sin ciudades ni gastos.
export default function DemoPage({ searchParams }: PageProps<"/demo">) {
  if (process.env.NODE_ENV !== "development") notFound();
  return (
    <Suspense fallback={<LoadingScreen label="Cargando el viaje" />}>
      <DemoTrip searchParams={searchParams} />
    </Suspense>
  );
}

async function DemoTrip({ searchParams }: { searchParams: PageProps<"/demo">["searchParams"] }) {
  const { como, vacio } = await searchParams;
  const me = typeof como === "string" && DEMO_TRIP.members.some((m) => m.id === `m-${como}`) ? `m-${como}` : DEMO_MY_MEMBER_ID;
  const trip =
    vacio !== undefined
      ? { ...DEMO_TRIP, name: "Viaje nuevo", stops: [], legs: [], stays: [], expenses: [], settlements: [], activity: [] }
      : { ...DEMO_TRIP, stops: await withCityPhotos(DEMO_TRIP.stops) };
  return <TripScreen trip={trip} chipDisplay="time" myMemberId={me} findPlaces={findPlaces} personal={vacio !== undefined ? { categories: [], expenses: [] } : DEMO_PERSONAL} />;
}
