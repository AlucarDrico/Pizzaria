export async function fetchUSDRate() {
    try {
        const response = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL');
        const data = await response.json();
        return parseFloat(data.USDBRL.bid);
    } catch (err) {
        console.warn('Erro na API de Cotação. Usando fallback:', err);
        return 5.20; // Fallback
    }
}