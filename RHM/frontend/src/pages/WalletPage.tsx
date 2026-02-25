import { useEffect, useState } from 'react'
import { api } from '../services/api'
import type { WalletEntry } from '../services/api'
import { toast } from 'sonner'

export function WalletPage() {
  const [entries, setEntries] = useState<WalletEntry[]>([])
  const [balance, setBalance] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(true)
  const [purchaseAmount, setPurchaseAmount] = useState('')
  const [purchaseProvider, setPurchaseProvider] = useState('Stripe')

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        const [ledgerData, balanceData] = await Promise.all([
          api.getWalletLedger(),
          api.getWalletBalance(),
        ])
        setEntries(ledgerData)
        setBalance(balanceData)
      } catch (error: any) {
        toast.error('Erreur lors du chargement du wallet')
        console.error(error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault()
    const amount = parseInt(purchaseAmount)
    if (isNaN(amount) || amount < 100) {
      toast.error('Montant minimum : 100 tokens')
      return
    }

    try {
      const entry = await api.purchaseTokens({
        amount,
        provider: purchaseProvider,
      })
      setEntries([entry, ...entries])
      setBalance(balance + amount)
      setPurchaseAmount('')
      toast.success(`Achat de ${amount} tokens effectué`)
    } catch (error: any) {
      toast.error('Erreur lors de l\'achat de tokens')
      console.error(error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-text-muted">Chargement du wallet...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            Wallet
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-text sm:text-3xl">
            Ledger tokens & achats
          </h1>
          <p className="mt-1 text-xs text-text-muted">
            Historique immuable des mouvements de tokens, multi-tenant compatible
            avec audit trail complet.
          </p>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1.2fr)]">
        <section className="space-y-3 rounded-2xl border border-border bg-bg-elevated p-4 text-xs shadow-sm">
          <h2 className="text-sm font-semibold text-text">
            Historique du ledger
          </h2>
          <p className="text-[11px] text-text-muted">
            Chaque entrée est signée côté backend et ne peut pas être modifiée a
            posteriori.
          </p>

          <div className="mt-2 space-y-2">
            {entries.length === 0 ? (
              <div className="py-4 text-center text-[11px] text-text-muted">
                Aucune entrée dans le ledger
              </div>
            ) : (
              entries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between rounded-xl border border-border bg-white px-3 py-2"
                >
                  <div className="text-[11px]">
                    <p className="text-xs font-medium text-text">
                      {entry.label}
                    </p>
                    <p className="text-[10px] text-text-muted">
                      {entry.createdAt} • Provider : {entry.provider}
                    </p>
                  </div>
                  <span
                    className={[
                      'text-xs font-semibold',
                      entry.type === 'credit'
                        ? 'text-success'
                        : 'text-accent-soft',
                    ].join(' ')}
                  >
                    {entry.amount > 0 ? '+' : ''}
                    {entry.amount} ⎔
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border border-border bg-bg-elevated p-4 text-xs shadow-sm">
          <h2 className="text-sm font-semibold text-text">
            Acheter des tokens
          </h2>
          

          <form onSubmit={handlePurchase} className="space-y-3">
            <div className="space-y-1">
              <label className="text-[11px] text-text-muted">
                Montant à acheter (tokens)
              </label>
              <input
                type="number"
                min={100}
                step={50}
                value={purchaseAmount}
                onChange={(e) => setPurchaseAmount(e.target.value)}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-[11px] text-text placeholder:text-text-muted focus:border-linkedin focus:outline-none"
                placeholder="Ex : 1 000"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-text-muted">
                Moyen de paiement
              </label>
              <select
                value={purchaseProvider}
                onChange={(e) => setPurchaseProvider(e.target.value)}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-[11px] text-text focus:border-linkedin focus:outline-none"
              >
                <option value="Stripe">Carte bancaire (Stripe)</option>
                <option value="Virement">Virement</option>
                <option value="RHM">RHM</option>
              </select>
            </div>

            <button
              type="submit"
              className="mt-1 inline-flex w-full items-center justify-center rounded-full bg-linkedin px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-linkedin/90"
            >
              Simuler l'achat
            </button>

            <p className="text-[10px] text-text-muted">
              Aucun paiement réel n'est déclenché dans cet environnement. Tous
              les événements seront cependant envoyés au ledger de test.
            </p>
          </form>
        </section>
      </div>
    </div>
  )
}
