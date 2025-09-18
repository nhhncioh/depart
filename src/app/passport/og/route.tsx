import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { getUserFlights } from '@/lib/passport/getUserFlights';
import { computePassportStats, formatKm, formatDuration } from '@/lib/passport/aggregate';

export const runtime = 'edge';

// Country code to emoji flag mapping
const getCountryFlag = (countryCode: string): string => {
  const flags: Record<string, string> = {
    'US': '🇺🇸', 'CA': '🇨🇦', 'GB': '🇬🇧', 'FR': '🇫🇷', 'DE': '🇩🇪',
    'IT': '🇮🇹', 'ES': '🇪🇸', 'NL': '🇳🇱', 'CH': '🇨🇭', 'JP': '🇯🇵',
    'KR': '🇰🇷', 'CN': '🇨🇳', 'TH': '🇹🇭', 'SG': '🇸🇬', 'AU': '🇦🇺',
    'NZ': '🇳🇿', 'AE': '🇦🇪', 'QA': '🇶🇦'
  };
  return flags[countryCode] || '🏳️';
};

// Format date for passport display
const formatPassportDate = (isoDate: string): string => {
  const date = new Date(isoDate);
  const day = date.getDate().toString().padStart(2, '0');
  const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
                      'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear().toString().slice(-2);
  return `${day} ${month} ${year}`;
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('u') || 'TRAVELER';

    // Get flight data (in real implementation, this would come from a database)
    const flights = getUserFlights();
    const stats = computePassportStats(flights);

    const mrzLine = `ALLTIME<<${username.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 10)}<<MEMBER${stats.firstSeenDate.replace(/-/g, '').slice(2)}<<@DEPART<<ISSUED${stats.issuedDate.replace(/-/g, '').slice(2)}<<${stats.placeOfIssueIata}<<DEPART.APP`;

    return new ImageResponse(
      (
        <div
          style={{
            background: 'linear-gradient(135deg, #0b1020 0%, #1a1f3a 100%)',
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '60px',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.08) 100%)',
              border: '2px solid rgba(255,255,255,0.2)',
              borderRadius: '30px',
              padding: '50px',
              width: '100%',
              maxWidth: '1000px',
              display: 'flex',
              flexDirection: 'column',
              color: 'white',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '40px' }}>
              <div>
                <div style={{ fontSize: '36px', fontWeight: 'bold', marginBottom: '8px' }}>
                  MY DEPART PASSPORT
                </div>
                <div style={{ fontSize: '14px', opacity: 0.7, letterSpacing: '2px' }}>
                  PASSPORT • PASS • PASAPORTE
                </div>
              </div>
              <div style={{ textAlign: 'right', fontSize: '18px' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Authority</div>
                <div style={{ opacity: 0.7 }}>Depart App</div>
              </div>
            </div>

            {/* World Map Placeholder */}
            <div
              style={{
                height: '200px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '15px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '30px',
                fontSize: '18px',
                opacity: 0.6,
              }}
            >
              🗺️ World Map with {stats.routes.length} Routes
            </div>

            {/* Country flags */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '30px', flexWrap: 'wrap' }}>
              {stats.countriesVisited.slice(0, 8).map((country) => (
                <span key={country} style={{ fontSize: '24px' }}>
                  {getCountryFlag(country)}
                </span>
              ))}
            </div>

            {/* Stats Grid */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
              {/* Left: Main Stats */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', gap: '60px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#7ab8ff' }}>
                      {stats.totalFlights}
                    </div>
                    <div style={{ fontSize: '14px', opacity: 0.7, textTransform: 'uppercase' }}>
                      Flights
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#7ab8ff' }}>
                      {formatKm(stats.totalDistanceKm)}
                    </div>
                    <div style={{ fontSize: '14px', opacity: 0.7, textTransform: 'uppercase' }}>
                      Distance
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '40px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#7ab8ff' }}>
                      {formatDuration(stats.totalFlightTimeMin)}
                    </div>
                    <div style={{ fontSize: '12px', opacity: 0.7, textTransform: 'uppercase' }}>
                      Flight Time
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#7ab8ff' }}>
                      {stats.uniqueAirports}
                    </div>
                    <div style={{ fontSize: '12px', opacity: 0.7, textTransform: 'uppercase' }}>
                      Airports
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#7ab8ff' }}>
                      {stats.uniqueAirlines}
                    </div>
                    <div style={{ fontSize: '12px', opacity: 0.7, textTransform: 'uppercase' }}>
                      Airlines
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Issuer Block */}
              <div style={{ textAlign: 'right', fontSize: '16px' }}>
                <div>
                  <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Place of issue</div>
                  <div style={{ marginBottom: '16px' }}>{stats.placeOfIssueIata}</div>
                </div>
                <div>
                  <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Date of issue</div>
                  <div style={{ marginBottom: '16px' }}>{formatPassportDate(stats.issuedDate)}</div>
                </div>
                <div>
                  <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Member since</div>
                  <div>{formatPassportDate(stats.firstSeenDate)}</div>
                </div>
              </div>
            </div>

            {/* MRZ Line */}
            <div
              style={{
                borderTop: '1px solid rgba(255,255,255,0.2)',
                paddingTop: '20px',
                fontSize: '12px',
                fontFamily: 'monospace',
                opacity: 0.8,
                letterSpacing: '1px',
                wordBreak: 'break-all',
              }}
            >
              {mrzLine}
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e: any) {
    console.error('OG Image generation failed:', e);
    return new Response(`Failed to generate image: ${e.message}`, {
      status: 500,
    });
  }
}