"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronUp,
  Dumbbell,
  ExternalLink,
  Info,
  Loader2,
  Play,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useMemo, useState } from "react";

import {
  Exercise,
  getTrainingProgram,
  getTrainingPrograms,
  TrainingDayExercise,
} from "@/lib/api";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MINIO_PUBLIC_URL =
  process.env.NEXT_PUBLIC_MINIO_PUBLIC_URL ?? "/minio";

function statValue(value: string | null | undefined) {
  return value && value !== "N/A" ? value : "-";
}

function browserMediaUrl(value: string | null | undefined) {
  if (!value) return null;
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }
  if (value.startsWith("s3://")) {
    const path = value.replace("s3://", "");
    return `${MINIO_PUBLIC_URL.replace(/\/$/, "")}/${path}`;
  }
  return value;
}

function localVideoUrl(exercise: Exercise) {
  const localVideo = exercise.media?.find(
    (media) => media.sourceType === "local_video" && media.localPath,
  );
  return browserMediaUrl(localVideo?.localPath);
}

function thumbnailUrl(exercise: Exercise) {
  const localVideo = exercise.media?.find(
    (media) => media.sourceType === "local_video" && media.thumbnailPath,
  );
  return browserMediaUrl(localVideo?.thumbnailPath);
}

function preferredVideoUrl(exercise: Exercise) {
  return localVideoUrl(exercise) ?? exercise.youtubeUrl;
}

function isBrowserUrl(value: string | null | undefined) {
  return Boolean(
    value?.startsWith("http://") ||
      value?.startsWith("https://") ||
      value?.startsWith("/"),
  );
}

function RpeLabel({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const helperId = useId();

  return (
    <span className="inline-flex items-center gap-1">
      {children}
      <span className="relative inline-flex">
        <button
          type="button"
          className="inline-flex size-4 items-center justify-center rounded-full text-muted-foreground transition hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Show RPE meaning"
          aria-describedby={isOpen ? helperId : undefined}
          aria-expanded={isOpen}
          onBlur={() => setIsOpen(false)}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
        >
          <Info className="h-3.5 w-3.5" />
        </button>
        {isOpen ? (
          <span
            id={helperId}
            role="tooltip"
            className="absolute bottom-full left-1/2 z-50 mb-2 w-72 max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-md bg-foreground px-3 py-2 text-left text-xs leading-5 text-background shadow-lg"
          >
            RPE means Rate of Perceived Exertion. It measures how hard a set
            feels: RPE 7 means about 3 reps left, RPE 8 means about 2 reps
            left, RPE 9 means about 1 rep left.
            <span className="absolute left-1/2 top-full size-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[2px] bg-foreground" />
          </span>
        ) : null}
      </span>
    </span>
  );
}

function YouTubeIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M21.6 7.2a2.7 2.7 0 0 0-1.9-1.9C18 4.9 12 4.9 12 4.9s-6 0-7.7.4a2.7 2.7 0 0 0-1.9 1.9A28 28 0 0 0 2 12a28 28 0 0 0 .4 4.8 2.7 2.7 0 0 0 1.9 1.9c1.7.4 7.7.4 7.7.4s6 0 7.7-.4a2.7 2.7 0 0 0 1.9-1.9A28 28 0 0 0 22 12a28 28 0 0 0-.4-4.8ZM10 15.1V8.9l5.2 3.1L10 15.1Z" />
    </svg>
  );
}

function YouTubeLink({
  className,
  exerciseName,
  url,
}: {
  className?: string;
  exerciseName: string;
  url: string | null;
}) {
  if (!url) return null;

  return (
    <a
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-md text-red-600 transition hover:bg-red-50 hover:text-red-700 focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
      href={url}
      target="_blank"
      rel="noreferrer"
      aria-label={`Open ${exerciseName} on YouTube`}
      title="Open on YouTube"
      onClick={(event) => event.stopPropagation()}
    >
      <YouTubeIcon className="h-5 w-5" />
    </a>
  );
}

function ExerciseThumbnail({
  exercise,
  isExpanded,
}: {
  exercise: Exercise;
  isExpanded: boolean;
}) {
  const thumbnail = thumbnailUrl(exercise);

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-md border bg-muted sm:w-40">
      {isBrowserUrl(thumbnail) ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbnail as string}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
          <Dumbbell className="h-8 w-8" />
        </div>
      )}
      <div className="absolute inset-0 flex items-center justify-center bg-black/10">
        <span className="inline-flex size-9 items-center justify-center rounded-full bg-background/90 shadow-sm">
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <Play className="ml-0.5 h-4 w-4" />
          )}
        </span>
      </div>
    </div>
  );
}

function ExerciseCard({
  item,
  expandedMediaKey,
  onToggleMedia,
}: {
  item: TrainingDayExercise;
  expandedMediaKey: string | null;
  onToggleMedia: (mediaKey: string) => void;
}) {
  const mainMediaKey = `main-${item.id}`;
  const isExpanded = expandedMediaKey === mainMediaKey;
  const mainLocalVideoUrl = localVideoUrl(item.exercise);
  const mainYouTubeUrl = item.exercise.youtubeUrl;
  const canShowInlineVideo = isBrowserUrl(mainLocalVideoUrl);
  const fallbackVideoUrl = preferredVideoUrl(item.exercise);
  const expandedSubstitution = item.substitutions.find(
    (substitution) => expandedMediaKey === `substitution-${substitution.id}`,
  );
  const expandedSubstitutionVideoUrl = expandedSubstitution
    ? localVideoUrl(expandedSubstitution.exercise)
    : null;

  return (
    <article className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <button
          className="shrink-0 text-left"
          type="button"
          onClick={() => onToggleMedia(mainMediaKey)}
          aria-expanded={isExpanded}
          aria-label={`${isExpanded ? "Hide" : "Show"} ${item.exercise.name} video`}
        >
          <ExerciseThumbnail exercise={item.exercise} isExpanded={isExpanded} />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase text-muted-foreground">
                Exercise {item.exerciseOrder}
              </p>
              <div className="mt-1 flex min-w-0 items-start gap-2">
                <h3 className="min-w-0 break-words text-xl font-semibold leading-tight">
                  {item.exercise.name}
                </h3>
                <YouTubeLink
                  className="-mt-1"
                  exerciseName={item.exercise.name}
                  url={mainYouTubeUrl}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {canShowInlineVideo || fallbackVideoUrl ? (
                <button
                  className={cn(
                    buttonVariants({ size: "sm", variant: "outline" }),
                  )}
                  type="button"
                  onClick={() => onToggleMedia(mainMediaKey)}
                  aria-expanded={isExpanded}
                >
                  {isExpanded ? <ChevronUp /> : <ChevronDown />}
                  {isExpanded ? "Hide video" : "Show video"}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {isExpanded ? (
        <div className="mt-4 overflow-hidden rounded-lg border bg-black">
          {canShowInlineVideo ? (
            <video
              className="aspect-video w-full bg-black"
              src={mainLocalVideoUrl as string}
              poster={
                isBrowserUrl(thumbnailUrl(item.exercise))
                  ? (thumbnailUrl(item.exercise) as string)
                  : undefined
              }
              controls
              loop
              muted
              playsInline
              preload="metadata"
            />
          ) : mainYouTubeUrl ? (
            <div className="flex min-h-40 flex-col items-center justify-center gap-3 p-6 text-center text-sm text-white">
              <p>Local video is not available yet.</p>
              <a
                className={cn(
                  buttonVariants({ size: "sm", variant: "secondary" }),
                )}
                href={mainYouTubeUrl}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink />
                Open YouTube
              </a>
            </div>
          ) : (
            <div className="flex min-h-32 items-center justify-center p-6 text-sm text-white">
              No video available.
            </div>
          )}
        </div>
      ) : null}

      <dl className="mt-4 grid gap-3 sm:grid-cols-4">
        <div className="rounded-md bg-muted px-3 py-2">
          <dt className="text-xs text-muted-foreground">Warm-up</dt>
          <dd className="text-sm font-medium">{statValue(item.warmupSets)}</dd>
        </div>
        <div className="rounded-md bg-muted px-3 py-2">
          <dt className="text-xs text-muted-foreground">Working sets</dt>
          <dd className="text-sm font-medium">{statValue(item.workingSets)}</dd>
        </div>
        <div className="rounded-md bg-muted px-3 py-2">
          <dt className="text-xs text-muted-foreground">Reps</dt>
          <dd className="text-sm font-medium">{statValue(item.reps)}</dd>
        </div>
        <div className="rounded-md bg-muted px-3 py-2">
          <dt className="text-xs text-muted-foreground">Rest</dt>
          <dd className="text-sm font-medium">{statValue(item.rest)}</dd>
        </div>
      </dl>

      <dl className="mt-3 grid gap-3 sm:grid-cols-3">
        <div className="rounded-md border px-3 py-2">
          <dt className="text-xs text-muted-foreground">
            <RpeLabel>Early set RPE</RpeLabel>
          </dt>
          <dd className="text-sm font-medium">{statValue(item.earlySetRpe)}</dd>
        </div>
        <div className="rounded-md border px-3 py-2">
          <dt className="text-xs text-muted-foreground">
            <RpeLabel>Last set RPE</RpeLabel>
          </dt>
          <dd className="text-sm font-medium">{statValue(item.lastSetRpe)}</dd>
        </div>
        <div className="rounded-md border px-3 py-2">
          <dt className="text-xs text-muted-foreground">Intensity</dt>
          <dd className="text-sm font-medium">
            {statValue(item.lastSetIntensityTechnique)}
          </dd>
        </div>
      </dl>

      {item.substitutions.length > 0 ? (
        <div className="mt-4">
          <p className="text-sm font-medium">Substitutions</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {item.substitutions.map((substitution) => {
              const substitutionLocalVideoUrl = localVideoUrl(
                substitution.exercise,
              );
              const substitutionYouTubeUrl = substitution.exercise.youtubeUrl;
              const canShowSubstitutionInline = isBrowserUrl(
                substitutionLocalVideoUrl,
              );
              const substitutionThumbnail = thumbnailUrl(substitution.exercise);
              const substitutionMediaKey = `substitution-${substitution.id}`;
              const isSubstitutionExpanded =
                expandedMediaKey === substitutionMediaKey;

              return (
                <div
                  key={substitution.id}
                  className={`flex min-h-16 items-center justify-between gap-3 rounded-md border px-3 py-2 ${
                    isSubstitutionExpanded ? "border-primary" : ""
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <button
                      className="relative size-12 shrink-0 overflow-hidden rounded-md border bg-muted disabled:cursor-default"
                      type="button"
                      onClick={() => onToggleMedia(substitutionMediaKey)}
                      disabled={!canShowSubstitutionInline}
                      aria-expanded={isSubstitutionExpanded}
                      aria-label={`${isSubstitutionExpanded ? "Hide" : "Show"} ${substitution.exercise.name} video`}
                    >
                      {isBrowserUrl(substitutionThumbnail) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={substitutionThumbnail as string}
                          alt=""
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                          <Dumbbell className="h-4 w-4" />
                        </div>
                      )}
                      {canShowSubstitutionInline ? (
                        <span className="absolute inset-0 flex items-center justify-center bg-black/10">
                          <span className="inline-flex size-6 items-center justify-center rounded-full bg-background/90 shadow-sm">
                            {isSubstitutionExpanded ? (
                              <ChevronUp className="h-3 w-3" />
                            ) : (
                              <Play className="ml-0.5 h-3 w-3" />
                            )}
                          </span>
                        </span>
                      ) : null}
                    </button>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">
                        Option {substitution.substitutionOrder}
                      </p>
                      <div className="flex min-w-0 items-start gap-1.5">
                        <p className="min-w-0 break-words text-sm font-medium">
                          {substitution.exercise.name}
                        </p>
                        <YouTubeLink
                          className="-mt-1 size-7"
                          exerciseName={substitution.exercise.name}
                          url={substitutionYouTubeUrl}
                        />
                      </div>
                    </div>
                  </div>
                  {canShowSubstitutionInline ? (
                    <button
                      className={cn(
                        buttonVariants({ size: "icon-sm", variant: "ghost" }),
                      )}
                      type="button"
                      onClick={() => onToggleMedia(substitutionMediaKey)}
                      aria-expanded={isSubstitutionExpanded}
                      aria-label={`${isSubstitutionExpanded ? "Hide" : "Show"} ${substitution.exercise.name} video`}
                    >
                      {isSubstitutionExpanded ? <ChevronUp /> : <Play />}
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>

          {expandedSubstitution && isBrowserUrl(expandedSubstitutionVideoUrl) ? (
            <div className="mt-3 overflow-hidden rounded-lg border bg-black">
              <video
                className="aspect-video w-full bg-black"
                src={expandedSubstitutionVideoUrl as string}
                poster={
                  isBrowserUrl(thumbnailUrl(expandedSubstitution.exercise))
                    ? (thumbnailUrl(expandedSubstitution.exercise) as string)
                    : undefined
                }
                controls
                loop
                muted
                playsInline
                preload="metadata"
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {item.notes ? (
        <section className="mt-4 rounded-md border border-primary/20 bg-primary/5 px-3 py-3">
          <p className="text-xs font-medium uppercase text-muted-foreground">
            Coaching note
          </p>
          <p className="mt-1 text-sm font-medium leading-6">{item.notes}</p>
        </section>
      ) : null}
    </article>
  );
}

export function TrainingProgramBrowser() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [expandedMediaKey, setExpandedMediaKey] = useState<string | null>(null);

  const programsQuery = useQuery({
    queryKey: ["training-programs"],
    queryFn: getTrainingPrograms,
  });

  const programs = useMemo(
    () => programsQuery.data?.programs ?? [],
    [programsQuery.data?.programs],
  );

  const requestedProgramId = Number(searchParams.get("program"));
  const requestedWeekNumber = Number(searchParams.get("week"));
  const requestedDayNumber = Number(searchParams.get("day"));
  const activeProgramId =
    programs.find((item) => item.id === requestedProgramId)?.id ??
    programs[0]?.id ??
    null;

  const programQuery = useQuery({
    queryKey: ["training-program", activeProgramId],
    queryFn: () => getTrainingProgram(activeProgramId as number),
    enabled: activeProgramId !== null,
  });

  const program = programQuery.data?.program;
  const weeks = useMemo(() => program?.weeks ?? [], [program?.weeks]);

  const selectedWeek = useMemo(
    () =>
      weeks.find((week) => week.weekNumber === requestedWeekNumber) ?? weeks[0],
    [requestedWeekNumber, weeks],
  );

  const days = useMemo(() => selectedWeek?.days ?? [], [selectedWeek?.days]);
  const selectedDay = useMemo(
    () => days.find((day) => day.dayNumber === requestedDayNumber) ?? days[0],
    [days, requestedDayNumber],
  );

  useEffect(() => {
    if (!activeProgramId || !selectedWeek || !selectedDay) return;
    if (
      requestedProgramId === activeProgramId &&
      requestedWeekNumber === selectedWeek.weekNumber &&
      requestedDayNumber === selectedDay.dayNumber
    ) {
      return;
    }

    const params = new URLSearchParams({
      program: String(activeProgramId),
      week: String(selectedWeek.weekNumber),
      day: String(selectedDay.dayNumber),
    });
    router.replace(`/admin/training?${params.toString()}`);
  }, [
    activeProgramId,
    requestedDayNumber,
    requestedProgramId,
    requestedWeekNumber,
    router,
    selectedDay,
    selectedWeek,
  ]);

  if (programsQuery.isLoading) {
    return (
      <section className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading programs
        </span>
      </section>
    );
  }

  if (programsQuery.error) {
    return (
      <section className="rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive">
        {programsQuery.error.message}
      </section>
    );
  }

  if (programs.length === 0) {
    return (
      <section className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
        No training programs found.
      </section>
    );
  }

  return (
    <div className="space-y-6">
      {programQuery.isLoading ? (
        <section className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading program
          </span>
        </section>
      ) : null}

      {programQuery.error ? (
        <section className="rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive">
          {programQuery.error.message}
        </section>
      ) : null}

      {program ? (
        <div className="grid gap-6">
          <section className="min-w-0 space-y-4">
            <header className="rounded-lg border bg-card p-5 shadow-sm">
              <p className="text-sm font-medium text-muted-foreground">
                Week {selectedWeek?.weekNumber ?? "-"} / Day{" "}
                {selectedDay?.dayNumber ?? "-"}
              </p>
              <h2 className="mt-1 text-2xl font-semibold">
                {selectedDay?.dayLabel ?? "No day selected"}
              </h2>
              <div className="mt-3 flex flex-wrap gap-2 text-sm text-muted-foreground">
                <span>{program.name}</span>
                {program.level ? (
                  <span className="rounded-md border px-2 py-1 capitalize">
                    {program.level}
                  </span>
                ) : null}
                {program.sourceName ? (
                  <span className="rounded-md border px-2 py-1">
                    {program.sourceName}
                  </span>
                ) : null}
                <span className="rounded-md border px-2 py-1">
                  {selectedDay?.exercises?.length ?? 0} exercises
                </span>
              </div>
            </header>

            {selectedDay?.exercises?.length ? (
              selectedDay.exercises.map((item) => (
                <ExerciseCard
                  key={item.id}
                  item={item}
                  expandedMediaKey={expandedMediaKey}
                  onToggleMedia={(mediaKey) =>
                    setExpandedMediaKey((current) =>
                      current === mediaKey ? null : mediaKey,
                    )
                  }
                />
              ))
            ) : (
              <section className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
                No exercises found for this day.
              </section>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
