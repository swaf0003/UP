import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

const EmptyState = ({ icon: Icon, title, description, action, className }: EmptyStateProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn("flex flex-col items-center justify-center py-12 px-6 text-center", className)}
    >
      <div className="w-16 h-16 rounded-2xl gradient-accent flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 text-accent-foreground" />
      </div>
      <h3 className="font-heading font-semibold text-foreground text-base mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-[250px] mb-4">{description}</p>
      {action && (
        <Button
          onClick={action.onClick}
          size="sm"
          className="rounded-xl gradient-primary text-primary-foreground"
        >
          {action.label}
        </Button>
      )}
    </motion.div>
  );
};

export default EmptyState;
