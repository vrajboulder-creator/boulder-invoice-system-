import React from "react";
import { Search, Bell } from "lucide-react";

function TopNav({ title }) {
  return (
    <header
      className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-100 bg-white px-6"
    >
      {/* Left — Page title / breadcrumb */}
      <h1 className="text-lg font-semibold text-slate-800">{title}</h1>

      {/* Right — search, notifications, avatar */}
      <div className="flex items-center gap-4">
        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search anything..."
            className="h-9 w-64 rounded-full bg-slate-100 pl-9 pr-4 text-sm text-slate-600 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-amber-300"
          />
        </div>

        {/* Notification bell */}
        <button
          type="button"
          className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            3
          </span>
        </button>

        {/* User avatar */}
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-400 text-sm font-semibold text-white select-none">
          MT
        </div>
      </div>
    </header>
  );
}

export default TopNav;
