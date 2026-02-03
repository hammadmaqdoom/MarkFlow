import { forwardRef } from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

const base = "rounded-lg border border-border bg-surface";

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className = "", ...props }, ref) => (
    <div ref={ref} className={`${base} ${className}`} {...props} />
  )
);
Card.displayName = "Card";

export function CardHeader({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`px-4 py-3 border-b border-border ${className}`}
      {...props}
    />
  );
}

export function CardContent({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`px-4 py-3 ${className}`} {...props} />;
}

export function CardFooter({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`px-4 py-3 border-t border-border flex justify-end gap-2 ${className}`}
      {...props}
    />
  );
}
