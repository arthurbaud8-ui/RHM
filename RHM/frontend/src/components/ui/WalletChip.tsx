type WalletChipProps = {
  balance: number
}

export function WalletChip({ balance }: WalletChipProps) {
  return (
    <button type="button" className="inline-flex items-center gap-1 rounded-full bg-slate-900/5 px-2 py-0.5 text-[10px] font-medium text-accent">
      ⎔ {balance}
    </button>
  )
}

