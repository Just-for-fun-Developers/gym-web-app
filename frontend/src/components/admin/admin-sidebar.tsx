"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  Bell,
  CalendarCheck,
  ChevronRight,
  CheckSquare,
  CreditCard,
  Dumbbell,
  LayoutDashboard,
  LogOut,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { getMe, getTrainingProgram, getTrainingPrograms, logout } from "@/lib/api";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/members", label: "Members", icon: Users },
  { href: "/admin/plans", label: "Plans", icon: CreditCard },
  { href: "/admin/muscles", label: "Muscles", icon: Activity },
  { href: "/admin/check-ins", label: "Check-ins", icon: CheckSquare },
  { href: "/admin/attendance", label: "Attendance", icon: CalendarCheck },
  { href: "/admin/notifications", label: "Notifications", icon: Bell },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/admin") {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function trainingHref(programId: number, weekNumber?: number, dayNumber?: number) {
  const params = new URLSearchParams({ program: String(programId) });
  if (weekNumber) {
    params.set("week", String(weekNumber));
  }
  if (dayNumber) {
    params.set("day", String(dayNumber));
  }
  return `/admin/training?${params.toString()}`;
}

export function AdminSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isMobile, setOpenMobile } = useSidebar();
  const isTrainingPage = isActivePath(pathname, "/admin/training");
  const [mobileExpandedWeekId, setMobileExpandedWeekId] = useState<
    number | null | undefined
  >(undefined);

  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: getMe,
    retry: false,
  });

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: async () => {
      await queryClient.clear();
      router.push("/login");
    },
  });

  const programsQuery = useQuery({
    queryKey: ["training-programs"],
    queryFn: getTrainingPrograms,
    enabled: isTrainingPage,
  });

  const programs = programsQuery.data?.programs ?? [];
  const requestedProgramId = Number(searchParams.get("program"));
  const requestedWeekNumber = Number(searchParams.get("week"));
  const requestedDayNumber = Number(searchParams.get("day"));
  const activeProgramId =
    programs.find((program) => program.id === requestedProgramId)?.id ??
    programs[0]?.id ??
    null;

  const activeProgramQuery = useQuery({
    queryKey: ["training-program", activeProgramId],
    queryFn: () => getTrainingProgram(activeProgramId as number),
    enabled: isTrainingPage && activeProgramId !== null,
  });

  const activeProgram = activeProgramQuery.data?.program;
  const weeks = activeProgram?.weeks ?? [];
  const selectedWeek =
    weeks.find((week) => week.weekNumber === requestedWeekNumber) ?? weeks[0];
  const selectedDay =
    selectedWeek?.days?.find((day) => day.dayNumber === requestedDayNumber) ??
    selectedWeek?.days?.[0];
  const selectedWeekId = selectedWeek?.id ?? null;
  const expandedWeekId =
    mobileExpandedWeekId === undefined ? selectedWeekId : mobileExpandedWeekId;
  const user = meQuery.data?.user;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" tooltip="Site Fitness" render={<Link href="/admin" />}>
              <Dumbbell />
              <span>Site Fitness</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Admin</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={isTrainingPage}
                  tooltip="Training"
                  render={<Link href="/admin/training" />}
                  onClick={() => setOpenMobile(false)}
                >
                  <Dumbbell />
                  <span>Training</span>
                  {isTrainingPage ? (
                    <ChevronRight className="ml-auto group-data-[collapsible=icon]:hidden" />
                  ) : null}
                </SidebarMenuButton>

                {isTrainingPage ? (
                  <SidebarMenuSub>
                    {programsQuery.isLoading ? (
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton>
                          <span>Loading programs</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ) : null}

                    {programs.map((program) => {
                      const isActiveProgram = program.id === activeProgramId;

                      return (
                        <SidebarMenuSubItem key={program.id}>
                          <SidebarMenuSubButton
                            isActive={isActiveProgram}
                            render={<Link href={trainingHref(program.id)} />}
                            onClick={() => setOpenMobile(false)}
                          >
                            <span>{program.name}</span>
                          </SidebarMenuSubButton>

                          {isActiveProgram && weeks.length > 0 ? (
                            <SidebarMenuSub className="mx-2 mt-1">
                              {weeks.map((week) => {
                                const firstDayNumber = week.days?.[0]?.dayNumber;
                                const isActiveWeek =
                                  selectedWeek?.id === week.id;
                                const isExpandedWeek = isMobile
                                  ? expandedWeekId === week.id
                                  : isActiveWeek;

                                return (
                                  <SidebarMenuSubItem key={week.id}>
                                    <SidebarMenuSubButton
                                      isActive={isActiveWeek}
                                      render={
                                        isMobile ? (
                                          <button type="button" />
                                        ) : (
                                          <Link
                                            href={trainingHref(
                                              program.id,
                                              week.weekNumber,
                                              firstDayNumber,
                                            )}
                                          />
                                        )
                                      }
                                      aria-expanded={isExpandedWeek}
                                      onClick={(event) => {
                                        if (isMobile) {
                                          event.preventDefault();
                                          setMobileExpandedWeekId((currentWeekId) =>
                                            currentWeekId === week.id ? null : week.id,
                                          );
                                          return;
                                        }

                                        setOpenMobile(false);
                                      }}
                                    >
                                      <span className="min-w-0 flex-1 truncate">
                                        Week {week.weekNumber}
                                      </span>
                                      <ChevronRight
                                        className={`ml-auto transition-transform ${
                                          isExpandedWeek ? "rotate-90" : ""
                                        }`}
                                      />
                                    </SidebarMenuSubButton>

                                    {isExpandedWeek && week.days?.length ? (
                                      <SidebarMenuSub className="mx-2 mt-1">
                                        {week.days.map((day) => (
                                          <SidebarMenuSubItem key={day.id}>
                                            <SidebarMenuSubButton
                                              isActive={selectedDay?.id === day.id}
                                              render={
                                                <Link
                                                  href={trainingHref(
                                                    program.id,
                                                    week.weekNumber,
                                                    day.dayNumber,
                                                  )}
                                                />
                                              }
                                              onClick={() => setOpenMobile(false)}
                                            >
                                              <span>
                                                Day {day.dayNumber}: {day.dayLabel}
                                              </span>
                                            </SidebarMenuSubButton>
                                          </SidebarMenuSubItem>
                                        ))}
                                      </SidebarMenuSub>
                                    ) : null}
                                  </SidebarMenuSubItem>
                                );
                              })}
                            </SidebarMenuSub>
                          ) : null}
                        </SidebarMenuSubItem>
                      );
                    })}
                  </SidebarMenuSub>
                ) : null}
              </SidebarMenuItem>

              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    isActive={isActivePath(pathname, item.href)}
                    tooltip={item.label}
                    render={<Link href={item.href} />}
                    onClick={() => setOpenMobile(false)}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarSeparator />

      <SidebarFooter>
        <div className="min-w-0 px-2 group-data-[collapsible=icon]:hidden">
          <p className="truncate text-sm font-medium">
            {user?.email ?? "Signed in"}
          </p>
          <p className="text-xs text-muted-foreground">{user?.role ?? "staff"}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
          className="justify-start group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
        >
          <LogOut />
          <span className="group-data-[collapsible=icon]:hidden">Sign out</span>
        </Button>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
