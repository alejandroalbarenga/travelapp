import { LoadingScreen } from "@/components/loading-screen";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { TripScreen } from "@/components/trip/trip-screen";
import { deleteTrip } from "@/app/actions";
import { getTrip } from "@/lib/trip-data";
import {
  addMember,
  addStop,
  changeStopPlace,
  deleteExpense,
  deletePersonalCategory,
  deletePersonalExpense,
  deleteStop,
  findPlaces,
  saveExpense,
  saveLeg,
  saveNights,
  savePersonalCategory,
  savePersonalExpense,
  saveStop,
  setMemberRole,
  setStopLocked,
  settleDebt,
  undoSettlement,
} from "./actions";

export default function TripPage({ params }: PageProps<"/viaje/[id]">) {
  return (
    <Suspense fallback={<LoadingScreen label="Cargando el viaje" />}>
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
      deleteTrip={deleteTrip}
      setStopLocked={setStopLocked}
      addMember={addMember}
      personal={data.personal}
      personalActions={{
        saveExpense: savePersonalExpense,
        deleteExpense: deletePersonalExpense,
        saveCategory: savePersonalCategory,
        deleteCategory: deletePersonalCategory,
      }}
    />;
}
