const DateSeparator = ({ date }: { date: string }) => {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = diff / (1000 * 60 * 60 * 24);

  let label: string;
  if (days < 1 && d.getDate() === now.getDate()) {
    label = "Aujourd'hui";
  } else if (days < 2 && d.getDate() === now.getDate() - 1) {
    label = "Hier";
  } else {
    label = d.toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined });
  }

  return (
    <div className="flex items-center justify-center my-4">
      <span className="text-[0.65rem] font-medium text-muted-foreground bg-muted/60 backdrop-blur-sm px-3 py-1 rounded-full">
        {label}
      </span>
    </div>
  );
};

export default DateSeparator;
