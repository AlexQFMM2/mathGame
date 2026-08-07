import {AppIcon} from "./AppIcon";
import "./BottomNavigation.css";

export type MainTab = "home" | "calendar" | "profile";

interface BottomNavigationProps {
  readonly activeTab: MainTab;
  readonly onChange: (tab: MainTab) => void;
}

export function BottomNavigation({activeTab, onChange}: BottomNavigationProps) {
  return (
    <nav className="bottom-navigation" aria-label="主导航">
      <button
        className={activeTab === "home" ? "bottom-navigation__item--active" : ""}
        type="button"
        aria-current={activeTab === "home" ? "page" : undefined}
        onClick={() => onChange("home")}
      >
        <AppIcon name="home" size={19} />
        <span>首页</span>
      </button>
      <button
        className={activeTab === "calendar" ? "bottom-navigation__item--active" : ""}
        type="button"
        aria-current={activeTab === "calendar" ? "page" : undefined}
        onClick={() => onChange("calendar")}
      >
        <AppIcon name="calendar" size={19} />
        <span>日历</span>
      </button>
      <button
        className={activeTab === "profile" ? "bottom-navigation__item--active" : ""}
        type="button"
        aria-current={activeTab === "profile" ? "page" : undefined}
        onClick={() => onChange("profile")}
      >
        <AppIcon name="user" size={19} />
        <span>我的</span>
      </button>
    </nav>
  );
}
