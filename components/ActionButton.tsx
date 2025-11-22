"use client";

import React from "react";

interface ActionButtonProps {
  icon: React.ReactNode;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  title?: string;
  className?: string;
  color?: "red" | "gold" | "default";
  showOnHover?: boolean;
  disabled?: boolean;
}

export default function ActionButton({
  icon,
  onClick,
  title,
  className = "",
  color = "default",
  showOnHover = false,
  disabled = false,
}: ActionButtonProps) {
  const colorClasses =
    color === "red"
      ? "bg-red-600 text-white hover:bg-red-700"
      : color === "gold"
      ? "bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90"
      : "bg-gray-800 text-white hover:bg-gray-700";
  const hoverClasses = showOnHover
    ? "opacity-0 group-hover:opacity-100 transition-all duration-300"
    : "";
  return (
    <button
      onClick={onClick}
      className={`absolute top-2 right-2 p-2 rounded-full ${colorClasses} ${hoverClasses} ${className}`}
      title={title}
      disabled={disabled}
      aria-disabled={disabled}
    >
      {icon}
    </button>
  );
}
