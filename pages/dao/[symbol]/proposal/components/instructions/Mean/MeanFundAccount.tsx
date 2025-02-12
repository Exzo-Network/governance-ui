import { Treasury } from '@mean-dao/msp'
import { Governance, ProgramAccount } from '@solana/spl-governance'
import React, { useContext, useEffect, useState } from 'react'
import useWalletStore from 'stores/useWalletStore'

import Input from '@components/inputs/Input'
import useGovernanceAssets from '@hooks/useGovernanceAssets'
import { getMintMinAmountAsDecimal } from '@tools/sdk/units'
import { precision } from '@utils/formatting'
import getMeanFundAccountInstruction from '@utils/instructions/Mean/getMeanFundAccountInstruction'
import { MeanFundAccount } from '@utils/uiTypes/proposalCreationTypes'
import { getMeanFundAccountSchema } from '@utils/validations'

import { NewProposalContext } from '../../../new'
import GovernedAccountSelect from '../../GovernedAccountSelect'

import SelectStreamingAccount from './SelectStreamingAccount'

interface Props {
  index: number
  governance: ProgramAccount<Governance> | null
}

const MeanFundAccountComponent = ({ index, governance }: Props) => {
  // form

  const [form, setForm] = useState<MeanFundAccount>({
    governedTokenAccount: undefined,
    mintInfo: undefined,
    amount: undefined,
    treasury: undefined,
  })

  const [formErrors, setFormErrors] = useState({})

  const handleSetForm = ({ propertyName, value }, restForm = {}) => {
    setFormErrors({})
    setForm({ ...form, [propertyName]: value, ...restForm })
  }

  // governedTokenAccount

  const shouldBeGoverned = !!(index !== 0 && governance)
  const { governedTokenAccountsWithoutNfts } = useGovernanceAssets()

  // instruction

  const schema = getMeanFundAccountSchema({ form })
  const { handleSetInstructions } = useContext(NewProposalContext)

  const connection = useWalletStore((s) => s.connection)
  const getInstruction = () =>
    getMeanFundAccountInstruction({
      connection,
      form,
      setFormErrors,
      schema,
    })

  useEffect(() => {
    handleSetInstructions(
      {
        governedAccount: form.governedTokenAccount?.governance,
        getInstruction,
      },
      index
    )
  }, [form])

  // mint info
  const mintMinAmount = form.mintInfo
    ? getMintMinAmountAsDecimal(form.mintInfo)
    : 1
  const currentPrecision = precision(mintMinAmount)

  useEffect(() => {
    setForm({
      ...form,
      mintInfo: form.governedTokenAccount?.extensions.mint?.account,
    })
  }, [form.governedTokenAccount])

  // amount

  const validateAmountOnBlur = () => {
    const value = form.amount

    handleSetForm({
      value: parseFloat(
        Math.max(
          mintMinAmount,
          Math.min(Number.MAX_SAFE_INTEGER, value ?? 0)
        ).toFixed(currentPrecision)
      ),
      propertyName: 'amount',
    })
  }

  const setAmount = (event) => {
    const value = event.target.value
    handleSetForm({
      value,
      propertyName: 'amount',
    })
  }

  // treasury

  const formTreasury = form.treasury as Treasury | undefined

  return (
    <React.Fragment>
      <SelectStreamingAccount
        label="Select streaming account destination"
        onChange={(treasury) => {
          handleSetForm(
            { value: treasury, propertyName: 'treasury' },
            { governedTokenAccount: undefined }
          )
        }}
        value={formTreasury}
        error={formErrors['treasury']}
      />
      <GovernedAccountSelect
        label="Select source of funds"
        governedAccounts={governedTokenAccountsWithoutNfts.filter(
          (a) =>
            a.extensions.mint?.publicKey.toBase58() ===
            formTreasury?.associatedToken.toString()
        )}
        onChange={(value) => {
          handleSetForm({ value, propertyName: 'governedTokenAccount' })
        }}
        value={form.governedTokenAccount}
        error={formErrors['governedTokenAccount']}
        shouldBeGoverned={shouldBeGoverned}
        governance={governance}
        type="token"
      />
      <Input
        min={mintMinAmount}
        max={Number.MAX_SAFE_INTEGER}
        label="Amount"
        value={form.amount}
        type="number"
        onChange={setAmount}
        step={mintMinAmount}
        error={formErrors['amount']}
        onBlur={validateAmountOnBlur}
        inputMode="decimal"
      />
    </React.Fragment>
  )
}

export default MeanFundAccountComponent
