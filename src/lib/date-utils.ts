export function formatDateIndo(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return dateStr;
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  } catch {
    return dateStr;
  }
}

export function formatDateIndoShort(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return dateStr;
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date).replace(/\//g, '-');
  } catch {
    return dateStr;
  }
}

export function formatDateRangeIndo(startStr: string | null | undefined, endStr: string | null | undefined): string {
  if (!startStr && !endStr) return '-';
  if (startStr && !endStr) return `${formatDateIndo(startStr)} - selesai`;
  if (!startStr && endStr) return `s/d ${formatDateIndo(endStr)}`;
  
  try {
    const start = new Date(startStr!);
    const end = new Date(endStr!);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return `${startStr} - ${endStr}`;
    }
    
    // Short format range: "DD/MM/YYYY - DD/MM/YYYY" or "DD-MM-YYYY - DD-MM-YYYY"
    const formatter = new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    return `${formatter.format(start)} s/d ${formatter.format(end)}`;
  } catch {
    return `${startStr} - ${endStr}`;
  }
}

export function formatDateForInput(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const trimmed = String(dateStr).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  const isoMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) return isoMatch[1];

  try {
    const d = new Date(trimmed);
    if (Number.isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return '';
  }
}
