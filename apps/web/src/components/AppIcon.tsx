import type {SVGProps} from "react";
import "./AppIcon.css";

export type AppIconName =
  | "arrow-left"
  | "arrow-right"
  | "check"
  | "calendar"
  | "compass"
  | "copy"
  | "eraser"
  | "flame"
  | "leaf"
  | "lightbulb"
  | "home"
  | "pause"
  | "pencil"
  | "play"
  | "trophy"
  | "undo"
  | "user";

interface AppIconProps extends Omit<SVGProps<SVGSVGElement>, "name"> {
  readonly name: AppIconName;
  readonly size?: number;
}

function IconPaths({name}: {readonly name: AppIconName}) {
  switch (name) {
    case "arrow-left":
      return <><path d="M19 12H5.5" /><path d="m11 18-6-6 6-6" /></>;
    case "arrow-right":
      return <><path d="M5 12h13.5" /><path d="m13 6 6 6-6 6" /></>;
    case "check":
      return <path d="m5 12.5 4.25 4.25L19 7" />;
    case "calendar":
      return <>
        <rect className="app-icon__soft" x="3.5" y="5.25" width="17" height="15.25" rx="3" />
        <path d="M8 3.5v3.4M16 3.5v3.4M3.5 9.5h17" />
        <rect className="app-icon__solid" x="7" y="12.25" width="3" height="3" rx=".8" />
        <path d="M14.25 13.75h2.5M8.25 18h2.5M14.25 18h2.5" />
      </>;
    case "compass":
      return <>
        <circle className="app-icon__soft" cx="12" cy="12" r="8.75" />
        <path d="m16.35 7.65-2.3 6.4-6.4 2.3 2.3-6.4 6.4-2.3Z" />
        <circle className="app-icon__solid" cx="12" cy="12" r="1.35" />
      </>;
    case "copy":
      return <>
        <rect className="app-icon__soft" x="8" y="8" width="11.5" height="11.5" rx="2.4" />
        <path d="M16 8V6.5A2.5 2.5 0 0 0 13.5 4h-7A2.5 2.5 0 0 0 4 6.5v7A2.5 2.5 0 0 0 6.5 16H8" />
      </>;
    case "eraser":
      return <>
        <path className="app-icon__soft" d="m4.25 14.8 8.45-8.55a2.35 2.35 0 0 1 3.3 0l1.85 1.85a2.35 2.35 0 0 1 0 3.3l-6.9 6.95H7.8L4.25 14.8Z" />
        <path d="m10.3 8.7 5 5M10.95 18.35H20" />
      </>;
    case "flame":
      return <>
        <path className="app-icon__soft" d="M13.7 3.15c.55 3.4-1.65 5.1-2.65 7.15-.95-1.35-1.2-2.85-.55-4.55-3.55 2.55-5.25 5.55-5.25 8.5a6.75 6.75 0 0 0 13.5-.05c0-3.95-1.8-7.7-5.05-11.05Z" />
        <path className="app-icon__solid" d="M12.15 10.8c2 1.75 2.7 3.45 2.15 4.9a2.65 2.65 0 0 1-5.1-.15c-.35-1.25.3-2.65 1.55-4 .1 1.05.5 1.85 1.05 2.35.55-.95.7-2 .35-3.1Z" />
      </>;
    case "leaf":
      return <>
        <path className="app-icon__soft" d="M19.5 4.5C11 4.1 6 8.25 6 14.05a5.4 5.4 0 0 0 5.45 5.4c6 0 8.4-5.95 8.05-14.95Z" />
        <path d="M4.5 20.25c2.4-4.85 6.1-8.3 11-10.6M9.1 15.3c1.85-.05 3.35.3 4.5 1.05" />
      </>;
    case "lightbulb":
      return <>
        <path className="app-icon__soft" d="M8.15 14.5a6.15 6.15 0 1 1 7.7 0c-1.15.85-1.4 1.65-1.4 2.3h-4.9c0-.65-.25-1.45-1.4-2.3Z" />
        <path d="M9.6 16.8h4.8M9.9 20h4.2M12 3V1.9M4.4 7.1l-1-.55M19.6 7.1l1-.55" />
      </>;
    case "home":
      return <>
        <path className="app-icon__soft" d="m3.5 10.55 7.1-6.05a2.15 2.15 0 0 1 2.8 0l7.1 6.05" />
        <path d="M5.8 9.2v9.15a1.65 1.65 0 0 0 1.65 1.65h9.1a1.65 1.65 0 0 0 1.65-1.65V9.2" />
        <path className="app-icon__solid" d="M9.6 20v-5.25c0-.7.55-1.25 1.25-1.25h2.3c.7 0 1.25.55 1.25 1.25V20" />
      </>;
    case "pause":
      return <><rect className="app-icon__solid" x="7.4" y="5.5" width="3.25" height="13" rx="1.25" /><rect className="app-icon__solid" x="13.35" y="5.5" width="3.25" height="13" rx="1.25" /></>;
    case "pencil":
      return <>
        <path className="app-icon__soft" d="m5 16.45-.65 3.25 3.25-.65L18.5 8.1a2.05 2.05 0 0 0 0-2.9 2.05 2.05 0 0 0-2.9 0L5 16.45Z" />
        <path d="m13.65 7.25 3.1 3.1M5.25 16.2l2.55 2.55" />
      </>;
    case "play":
      return <path className="app-icon__solid" d="M8.15 6.35v11.3c0 1.05 1.15 1.7 2.05 1.15l8.6-5.65c.8-.5.8-1.8 0-2.3L10.2 5.2c-.9-.55-2.05.1-2.05 1.15Z" />;
    case "trophy":
      return <>
        <path className="app-icon__soft" d="M7.25 4h9.5v4.6c0 3.55-1.9 5.9-4.75 5.9S7.25 12.15 7.25 8.6V4Z" />
        <path d="M7.25 6H4.3v1.55c0 2.65 1.35 4.15 3.85 4.15M16.75 6h2.95v1.55c0 2.65-1.35 4.15-3.85 4.15M12 14.5v3.2M8.4 20h7.2M9.6 17.7h4.8" />
        <path className="app-icon__solid" d="m12 6.25.75 1.5 1.65.25-1.2 1.15.3 1.65-1.5-.8-1.5.8.3-1.65L9.6 8l1.65-.25.75-1.5Z" />
      </>;
    case "undo":
      return <><path d="m8.75 7.25-4.5 4.5 4.5 4.5" /><path d="M4.75 11.75h7.1a7.15 7.15 0 0 1 7.15 7.1" /></>;
    case "user":
      return <>
        <circle className="app-icon__soft" cx="12" cy="8" r="4" />
        <path d="M4.75 20c.65-4 3.25-6.25 7.25-6.25S18.6 16 19.25 20" />
        <circle cx="12" cy="8" r="4" />
      </>;
  }
}

export function AppIcon({name, size = 20, className = "", ...props}: AppIconProps) {
  return (
    <svg
      className={`app-icon ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <IconPaths name={name} />
    </svg>
  );
}
