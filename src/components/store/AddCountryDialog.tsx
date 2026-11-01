import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Select } from '@/components/ui/Select';
import { formatCountry } from '@/utils/country';
import { COUNTRY_CODES } from '@/constants/countries';

const collator = new Intl.Collator('en');

/** Adds a country tab; it is saved once its first zone is added. */
export function AddCountryDialog({
  existingCountries,
  onAdd,
  onClose,
}: {
  existingCountries: string[];
  onAdd: (country: string) => void;
  onClose: () => void;
}) {
  const [country, setCountry] = useState('');
  const options = COUNTRY_CODES.filter((code) => !existingCountries.includes(code))
    .map((code) => ({ value: code, label: formatCountry(code) }))
    .sort((first, second) => collator.compare(first.label, second.label));

  return (
    <Dialog
      isOpen
      title="Add country"
      description="Then add the zones you deliver to there."
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!country} onClick={() => onAdd(country)}>
            Add
          </Button>
        </>
      }
    >
      <Select
        label="Country"
        placeholder="Choose…"
        options={options}
        value={country}
        onChange={(event) => setCountry(event.target.value)}
      />
    </Dialog>
  );
}
