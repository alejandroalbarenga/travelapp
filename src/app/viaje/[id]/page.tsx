import { notFound } from "next/navigation";
import { Suspense } from "react";
import { TripScreen } from "@/components/trip/trip-screen";
import { getTrip } from "@/lib/trip-data";
import {
  addStop,
  changeStopPlace,
  deleteExpense,
  deleteStop,
  findPlaces,
  saveExpense,
  saveLeg,
  saveNights,
  saveStop,
  setMemberRole,
  settleDebt,
  undoSettlement,
} from "./actions";

export default function TripPage({ params }: PageProps<"/viaje/[id]">) {
  return (
    <Suspense fallback={<p className="p-5 text-[15px] text-ink-2">Cargando el viaje…</p>}>
      <Trip params={params} />
    </Suspense>
  );
}

async function Trip({ params }: { params: PageProps<"/viaje/[id]">["params"] }) {
  const { id } = await params;
  const data = await getTrip(id);
  if (!data) notFound();
  return <TripScreen trip={data.trip} chipDisplay={data.chipDisplay} myMemberId={data.myMemberId} saveNights={saveNights} saveLeg={saveLeg} saveStop={saveStop} deleteStop={deleteStop} setMemberRole={setMemberRole}
      findPlaces={findPlaces}
      addStop={addStop}
      changeStopPlace={changeStopPlace}
      saveExpense={saveExpense}
      deleteExpense={deleteExpense}
      settleDebt={settleDebt}
      undoSettlement={undoSettlement}
    />;
}
