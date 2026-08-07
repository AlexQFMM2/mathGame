import {GAME_CATALOG, type GameId} from "@math-game/game-core";
import {useMemo, useState} from "react";
import {AppIcon} from "../../components/AppIcon";
import {
  formatLocalDateKey,
  getCurrentStreak,
  getDayProgress,
  getMonthProgress,
  type ActivityRecord,
} from "./activity";
import "./CalendarPage.css";

interface CalendarPageProps {
  readonly activity: ActivityRecord;
  readonly onStartCheckInTask: (
    dateKey: string,
    mode: "daily" | "makeup",
    gameId: GameId,
  ) => void;
}

const WEEKDAY_LABELS = ["一", "二", "三", "四", "五", "六", "日"] as const;

const TROPHY_LABELS = {
  gold: "金色",
  silver: "银色",
  bronze: "铜色",
} as const;

export function CalendarPage({activity, onStartCheckInTask}: CalendarPageProps) {
  const today = new Date();
  const todayKey = formatLocalDateKey(today);
  const [viewedMonth, setViewedMonth] = useState(() => (
    new Date(today.getFullYear(), today.getMonth(), 1)
  ));
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(todayKey);
  const [actionMessage, setActionMessage] = useState("");
  const year = viewedMonth.getFullYear();
  const monthIndex = viewedMonth.getMonth();
  const progress = getMonthProgress(activity, year, monthIndex);
  const streak = getCurrentStreak(activity, today);
  const leadingBlanks = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
  const cells = useMemo(() => Array.from({length: 42}, (_, slot) => {
    const day = slot - leadingBlanks + 1;
    return day >= 1 && day <= progress.totalDays ? day : null;
  }), [leadingBlanks, progress.totalDays]);
  const isCurrentMonth = year === today.getFullYear() && monthIndex === today.getMonth();
  const selectedProgress = selectedDateKey === null ? null : getDayProgress(activity, selectedDateKey);
  const selectedTaskIds = new Set(selectedProgress?.tasks.map((task) => task.gameId) ?? []);
  const availableGames = GAME_CATALOG.filter((game) => (
    game.status === "available" && (selectedProgress === null || selectedTaskIds.has(game.id))
  ));
  const percentage = Math.round((progress.completedDays / progress.totalDays) * 100);
  const trophyClassName = progress.trophyTier === null
    ? "monthly-trophy monthly-trophy--locked"
    : `monthly-trophy monthly-trophy--${progress.trophyTier} monthly-trophy--complete`;
  const selectedDateParts = selectedDateKey?.split("-").map(Number) ?? null;
  const selectedIsToday = selectedDateKey === todayKey;
  const selectedIsPast = selectedDateKey !== null && selectedDateKey < todayKey;
  const actionLabel = selectedProgress?.isMakeup
    ? "已补签"
    : selectedProgress?.isCheckedIn
      ? "已打卡"
      : selectedIsToday
        ? "任选一项"
        : selectedIsPast
          ? "任选一项"
          : "选择日期";
  const canStartTask = selectedProgress !== null
    && !selectedProgress.isComplete
    && (selectedIsToday || selectedIsPast);
  const selectedTitle = selectedDateParts === null
    ? "选择日期"
    : selectedIsToday
      ? "今日任务"
      : `${selectedDateParts[1]} 月 ${selectedDateParts[2]} 日任务`;
  const selectedHint = selectedProgress === null
    ? "点击下方日期查看"
    : selectedProgress.isMakeup
      ? "这一天通过补签完成"
      : selectedProgress.isCheckedIn
        ? "这一天已完成打卡"
        : selectedIsToday
          ? "任选下方一项，完成一局后自动打卡"
          : "任选下方一项，完成一局后自动补签";

  const moveMonth = (offset: number) => {
    setViewedMonth(new Date(year, monthIndex + offset, 1));
    setSelectedDateKey(null);
    setActionMessage("");
  };

  const submitSelectedTask = (gameId: GameId) => {
    if (selectedDateKey === null || !canStartTask) return;
    onStartCheckInTask(
      selectedDateKey,
      selectedIsToday ? "daily" : "makeup",
      gameId,
    );
    setActionMessage(`正在进入${selectedIsToday ? "今日" : "补签"}任务`);
  };

  return (
    <section className="calendar-page">
      <div className="calendar-page__orb" aria-hidden="true" />
      <header className="calendar-page__header">
        <div>
          <p>练习日历</p>
          <h1>每日任务</h1>
        </div>
        <span><b>{streak}</b><small>连续天数</small></span>
      </header>

      <article className={`daily-tasks${selectedProgress?.isComplete ? " daily-tasks--complete" : ""}`}>
        <header>
          <span><strong>{selectedTitle}</strong><small>{selectedHint}</small></span>
          <b className="daily-tasks__state">{actionLabel}</b>
        </header>
        <div>
          {availableGames.map((game) => {
            const task = selectedProgress?.tasks.find((item) => item.gameId === game.id);
            return (
              <button className={task?.completed ? "daily-task--complete" : ""} type="button" disabled={!canStartTask} key={game.id} onClick={() => submitSelectedTask(game.id)}>
                <i aria-hidden="true">{task?.completed ? <AppIcon name="check" size={9} /> : canStartTask ? <AppIcon name="play" size={8} /> : ""}</i>
                <strong>{game.title}</strong>
                <small>{selectedProgress === null
                  ? "选择日期后查看"
                  : task?.completed
                    ? `已完成 ${task.completedGames} 局`
                    : selectedProgress.isComplete
                      ? "本次未选择"
                      : canStartTask
                        ? "点击开始"
                        : "尚未完成"}</small>
              </button>
            );
          })}
        </div>
      </article>

      <article className={trophyClassName}>
        <span className="monthly-trophy__icon" aria-hidden="true">
          <AppIcon className="monthly-trophy__icon-base" name="trophy" size={31} />
          <span
            className="monthly-trophy__icon-fill"
            style={{clipPath: `inset(${100 - percentage}% 0 0)`}}
          >
            <AppIcon name="trophy" size={31} />
          </span>
        </span>
        <div className="monthly-trophy__copy">
          <small>{year} 年 {monthIndex + 1} 月</small>
          <strong>{progress.trophyTier === null
            ? "全勤奖杯未解锁"
            : `${TROPHY_LABELS[progress.trophyTier]}全勤奖杯`}</strong>
          <p>{progress.isComplete
            ? `整月完成 · 使用 ${progress.makeupDays} 次补签`
            : `打卡 ${progress.completedDays}/${progress.totalDays} 天 · 已补签 ${progress.makeupDays} 次`}</p>
          <span className="monthly-trophy__progress"><i style={{width: `${percentage}%`}} /></span>
        </div>
      </article>

      <div className="calendar-month-switcher">
        <button type="button" onClick={() => moveMonth(-1)} aria-label="上一个月"><AppIcon name="arrow-left" size={16} /></button>
        <div><strong>{year} 年 {monthIndex + 1} 月</strong><small>{progress.completedDays} 天打卡 · 共 {progress.totalGames} 局</small></div>
        <button type="button" disabled={isCurrentMonth} onClick={() => moveMonth(1)} aria-label="下一个月"><AppIcon name="arrow-right" size={16} /></button>
      </div>

      <div className="calendar-weekdays" aria-hidden="true">
        {WEEKDAY_LABELS.map((label) => <span key={label}>{label}</span>)}
      </div>

      <div className="calendar-grid" role="grid" aria-label={`${year} 年 ${monthIndex + 1} 月练习记录`}>
        {cells.map((day, slot) => {
          if (day === null) {
            return <span className="calendar-day calendar-day--empty" aria-hidden="true" key={`empty-${slot}`} />;
          }
          const date = new Date(year, monthIndex, day, 12);
          const dateKey = formatLocalDateKey(date);
          const dayProgress = getDayProgress(activity, dateKey);
          const completed = dayProgress.isComplete;
          const partial = dayProgress.completedTasks > 0 && !completed;
          const isToday = dateKey === todayKey;
          const isFuture = dateKey > todayKey;
          const isSelected = dateKey === selectedDateKey;
          const selectable = !isFuture;
          const className = [
            "calendar-day",
            completed ? "calendar-day--completed" : "",
            dayProgress.isMakeup ? "calendar-day--makeup" : "",
            partial ? "calendar-day--partial" : "",
            selectable && !completed ? "calendar-day--available" : "",
            isSelected ? "calendar-day--selected" : "",
            isToday ? "calendar-day--today" : "",
            isFuture ? "calendar-day--future" : "",
          ].filter(Boolean).join(" ");
          const label = dayProgress.isMakeup
            ? `${monthIndex + 1} 月 ${day} 日，已补打卡`
            : completed
            ? `${monthIndex + 1} 月 ${day} 日，每日任务 ${dayProgress.completedTasks}/${dayProgress.totalTasks}，打卡成功，共完成 ${dayProgress.totalGames} 局`
            : selectable
            ? `${monthIndex + 1} 月 ${day} 日，未打卡，点击查看任务`
            : `${monthIndex + 1} 月 ${day} 日，每日任务 ${dayProgress.completedTasks}/${dayProgress.totalTasks}，未打卡`;

          const content = (
            <>
              <b>{day}</b>
              {completed && <i aria-hidden="true"><AppIcon name="check" size={8} /></i>}
              {dayProgress.isMakeup && <small>补签</small>}
              {completed && !dayProgress.isMakeup && dayProgress.totalGames > 1 && <small>{dayProgress.totalGames} 局</small>}
              {partial && <small>{dayProgress.completedTasks}/{dayProgress.totalTasks}</small>}
              {selectable && !completed && !partial && !isToday && <small>未签</small>}
              {isToday && dayProgress.completedTasks === 0 && <small>今天</small>}
            </>
          );

          return selectable ? (
            <button
              className={className}
              type="button"
              role="gridcell"
              aria-label={label}
              key={dateKey}
              onClick={() => {
                setSelectedDateKey(dateKey);
                setActionMessage("");
              }}
            >{content}</button>
          ) : (
            <span className={className} role="gridcell" aria-label={label} key={dateKey}>{content}</span>
          );
        })}
      </div>

      <footer className="calendar-page__legend">
        <span><i /> 打卡成功</span>
        <span aria-live="polite">{actionMessage || "任选一项完成后签到"}</span>
      </footer>
    </section>
  );
}
