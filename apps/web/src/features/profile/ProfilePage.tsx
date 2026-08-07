import {AppIcon} from "../../components/AppIcon";
import {
  formatLocalDateKey,
  getActivitySummary,
  getDayProgress,
  type ActivityRecord,
} from "../activity/activity";
import "./ProfilePage.css";

interface ProfilePageProps {
  readonly activity: ActivityRecord;
}

export function ProfilePage({activity}: ProfilePageProps) {
  const today = new Date();
  const summary = getActivitySummary(activity, today);
  const todayProgress = getDayProgress(activity, formatLocalDateKey(today));
  return (
    <section className="profile-page">
      <div className="profile-page__orb" aria-hidden="true" />
      <header className="profile-page__header">
        <p>个人中心</p>
        <h1>我的</h1>
      </header>

      <article className="profile-identity">
        <span aria-hidden="true"><AppIcon name="user" size={28} /></span>
        <div><strong>本地玩家</strong><small>记录只保存在当前设备</small></div>
        <b>{todayProgress.completedTasks}/{todayProgress.totalTasks}<small>今日任务</small></b>
      </article>

      <div className="profile-stats" aria-label="练习统计">
        <span><b>{summary.checkedInDays}</b><small>累计打卡</small></span>
        <span><b>{summary.totalGames}</b><small>完成局数</small></span>
        <span><b>{summary.currentStreak}</b><small>连续天数</small></span>
        <span><b>{summary.completedMonths}</b><small>全勤奖杯</small></span>
      </div>

      <p className="profile-page__privacy"><i aria-hidden="true"><AppIcon name="check" size={10} /></i> 离线存档 · 无账号 · 无云端上传</p>
    </section>
  );
}
