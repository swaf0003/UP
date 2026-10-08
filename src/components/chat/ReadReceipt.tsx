import { Check, CheckCheck } from "lucide-react";

interface ReadReceiptProps {
  read: boolean;
  isMine: boolean;
}

const ReadReceipt = ({ read, isMine }: ReadReceiptProps) => {
  if (!isMine) return null;
  return read ? (
    <CheckCheck className="w-3.5 h-3.5 shrink-0 text-white/70" />
  ) : (
    <Check className="w-3.5 h-3.5 shrink-0 text-white/50" />
  );
};

export default ReadReceipt;
