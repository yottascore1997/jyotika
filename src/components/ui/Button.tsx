interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger";
  size?: "sm" | "md";
}

export default function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: ButtonProps) {
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-sm",
    secondary: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
    danger: "bg-rose-600 text-white hover:bg-rose-700",
  };
  const sizes = {
    sm: "px-3.5 py-2 text-sm rounded-lg",
    md: "px-5 py-2.5 text-base rounded-lg",
  };

  return (
    <button
      className={`inline-flex items-center justify-center gap-2 font-semibold transition disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
