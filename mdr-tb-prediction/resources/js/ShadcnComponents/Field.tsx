import { Label } from '@/ShadcnComponents/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/ShadcnComponents/ui/select';
import { PropsWithChildren } from 'react';

interface Props extends PropsWithChildren {
    id: string;
    label: string;
    error?: string;
    hint?: string;
    required?: boolean;
}

/** Pembungkus satu ruas formulir beserta label, keterangan, dan pesan galat. */
export function Field({ id, label, error, hint, required, children }: Props) {
    return (
        <div className="space-y-1.5">
            <Label htmlFor={id}>
                {label}
                {required && <span className="ml-0.5 text-destructive">*</span>}
            </Label>
            {children}
            {hint && !error && (
                <p className="text-xs text-muted-foreground">{hint}</p>
            )}
            {error && (
                <p role="alert" className="text-xs font-medium text-destructive">
                    {error}
                </p>
            )}
        </div>
    );
}

interface SelectFieldProps {
    id: string;
    label: string;
    value: string;
    options: readonly string[] | Record<string, string>;
    onChange: (value: string) => void;
    error?: string;
    hint?: string;
    placeholder?: string;
    required?: boolean;
}

/** Ruas formulir bertipe pilihan untuk variabel kategorikal. */
export function SelectField({
    id,
    label,
    value,
    options,
    onChange,
    error,
    hint,
    placeholder = 'Pilih salah satu',
    required,
}: SelectFieldProps) {
    const entries = Array.isArray(options)
        ? options.map((opt) => [opt, opt] as const)
        : Object.entries(options);

    return (
        <Field id={id} label={label} error={error} hint={hint} required={required}>
            <Select value={value} onValueChange={onChange}>
                <SelectTrigger
                    id={id}
                    aria-invalid={Boolean(error)}
                    className={error ? 'border-destructive' : undefined}
                >
                    <SelectValue placeholder={placeholder} />
                </SelectTrigger>
                <SelectContent>
                    {entries.map(([val, label]) => (
                        <SelectItem key={val} value={val}>
                            {label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </Field>
    );
}
