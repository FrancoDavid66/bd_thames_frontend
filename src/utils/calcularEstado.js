import { format, differenceInDays, isToday } from 'date-fns';

export function calcularEstado(fechaVencimiento) {
    const hoy = new Date();
    const vencimiento = new Date(fechaVencimiento);

    if (isToday(vencimiento)) {
        return 'Vence hoy';
    }

    const diasRestantes = differenceInDays(vencimiento, hoy);

    if (diasRestantes > 0 && diasRestantes <= 7) {
        return 'Por vencer';
    } else if (diasRestantes > 7) {
        return 'Al día';
    } else {
        return 'Vencida';
    }
}
