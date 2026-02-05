"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getCoordinatorProfile } from "../../services/coordinators";

function CoordinatorsContent() {
  const searchParams = useSearchParams();
  const coordinatorId = searchParams.get('coordinatorId');
  const [coord, setCoord] = useState(null);

  useEffect(() => {
    if (!coordinatorId) return;
    (async () => {
      const c = await getCoordinatorProfile(coordinatorId);
      setCoord(c);
    })();
  }, [coordinatorId]);

  if (!coordinatorId) {
    return (
      <div className="mx-auto max-w-4xl p-6 text-sm text-black/60">
        Please provide a coordinator ID.
      </div>
    );
  }

  if (!coord) {
    return (
      <div className="mx-auto max-w-4xl p-6 text-sm text-black/60">
        Loading event organizer…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="flex items-start gap-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={coord.avatar}
          alt=""
          className="h-20 w-20 rounded-full object-cover"
        />
        <div>
          <h1 className="text-2xl font-semibold">{coord.name}</h1>
          <div className="text-sm text-black/60">{coord.organization}</div>
          <p className="text-sm mt-2">{coord.bio}</p>
        </div>
      </div>
    </div>
  );
}

export default function CoordinatorProfilePage() {
  return (
    <Suspense fallback={
      <div className="mx-auto max-w-4xl p-6 text-sm text-black/60">
        Loading…
      </div>
    }>
      <CoordinatorsContent />
    </Suspense>
  );
}
