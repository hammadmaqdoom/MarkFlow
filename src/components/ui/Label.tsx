import { forwardRef } from "react";

export interface LabelProps
  extends React.LabelHTMLAttributes<HTMLLabelElement> {}

const base = "text-sm font-medium text-text";

export const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ className = "", ...props }, ref) => (
    <label ref={ref} className={`${base} ${className}`} {...props} />
  )
);
Label.displayName = "Label";
