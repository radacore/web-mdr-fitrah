import re

with open('/Users/rada/Downloads/kak sri/mdr-tb-prediction/resources/js/Pages/Welcome.tsx', 'r') as f:
    content = f.read()

# Fix total steps
content = re.sub(r'const totalSteps = 5;', 'const totalSteps = 5;', content)

# Fix validateStep
old_validate = r'''    const validateStep = \(currentStep: number\): string \| null => \{
        switch \(currentStep\) \{
            case 1: // Data Demografi
                if \(!namaLengkap.trim\(\)\) return "Nama lengkap wajib diisi";
                if \(!formData.ket_usia\) return "Usia wajib diisi";
                if \(!formData.jenis_kelamin\)
                    return "Jenis kelamin wajib dipilih";
                if \(!formData.status_bekerja\) return "Pekerjaan wajib dipilih";
                break;
            case 2: // Data Klinis
                if \(!formData.riwayat_pengobatan\)
                    return "Riwayat pengobatan wajib dipilih";
                if \(!formData.panduan_pengobatan\)
                    return "Panduan pengobatan wajib dipilih";
                if \(!formData.efek_samping_obat\)
                    return "Efek samping obat wajib dipilih";
                if \(!formData.bb\) return "Berat badan wajib diisi";
                if \(!formData.tb\) return "Tinggi badan wajib diisi";
                if \(!formData.status_gizi\) return "Status gizi wajib dipilih";
                break;
            case 3: // Perilaku Pasien
                if \(!formData.kepatuhan_minum_obat\)
                    return "Kepatuhan minum obat wajib dipilih";
                if \(!formData.status_merokok\)
                    return "Status merokok wajib dipilih";
                break;
            case 4: // Riwayat & Komorbiditas
                if \(!formData.riwayat_dm\) return "Riwayat DM wajib dipilih";
                if \(!formData.riwayat_hiv\) return "Riwayat HIV wajib dipilih";
                if \(!formData.komorbiditas\) return "Komorbiditas wajib dipilih";
                if \(!formData.pemeriksaan_kontak\)
                    return "Pemeriksaan kontak wajib dipilih";
                break;
        \}
        return null;
    \};'''

# It's better to read the original from history if I didn't ruin it completely.
# Let's restore the file first from git!
