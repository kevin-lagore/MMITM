# Meet in the Middle (MMITM)

A web application that helps multiple people find a fair meeting location based on travel time, not straight-line distance.

![MMITM Screenshot](docs/screenshot.png)

## Features

- **Multi-participant Support**: Add 2+ participants with different starting locations
- **Multiple Transport Modes**: Driving, walking, cycling, and public transit
- **Smart Intent Parsing**: Natural language destination descriptions ("coffee shop", "pub for lunch", "park")
- **Fair Location Finding**: Algorithm minimizes travel time variance across all participants
- **Interactive Map**: Visualize participant locations and recommended venues
- **Deep Links**: Open directions in Google Maps, Apple Maps, or Waze

## Tech Stack

### Frontend
- React 18 + TypeScript
- Vite (build tool)
- Leaflet.js + React-Leaflet (maps)
- Tailwind CSS (styling)
- Zustand (state management)

### Backend
- Node.js + Express.js
- TypeScript
- Zod (validation)

### External APIs
- **OpenRouteService**: Routing and travel time matrices
- **Google Maps Directions API**: Public transit routing
- **OpenAI (gpt-4o-mini)**: Intent parsing
- **Foursquare Places**: Venue search
- **Nominatim**: Geocoding

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- API keys for the external services (see below)

### API Keys Setup

You'll need to obtain API keys from the following services:

1. **OpenAI**: https://platform.openai.com/api-keys
2. **OpenRouteService**: https://openrouteservice.org/dev/#/signup (free, 2000 requests/day)
3. **Foursquare**: https://developer.foursquare.com/ (free tier available)
4. **Google Cloud Console**: https://console.cloud.google.com/
   - Enable "Directions API" and "Distance Matrix API"
   - $200/month free credit

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/mmitm.git
   cd mmitm
   ```

2. **Set up the backend**
   ```bash
   cd backend
   npm install
   cp ../.env.example .env
   # Edit .env with your API keys
   ```

3. **Set up the frontend**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Start the development servers**

   In one terminal (backend):
   ```bash
   cd backend
   npm run dev
   ```

   In another terminal (frontend):
   ```bash
   cd frontend
   npm run dev
   ```

5. **Open http://localhost:5173** in your browser

## Usage

1. **Add Participants**: Enter each person's name, starting address, and preferred transport mode
2. **Describe Your Destination**: Type what kind of place you're looking for (e.g., "quiet coffee shop", "pub with outdoor seating")
3. **Find Meeting Place**: Click the button to search
4. **View Results**: Browse recommended venues, sorted by fairness of travel time
5. **Get Directions**: Click to open directions in your preferred maps app

## How the Algorithm Works

1. **Geocode** all participant addresses
2. **Compute geographic centroid** as initial search area
3. **Generate candidate grid** (25 points around centroid)
4. **Calculate travel time matrix** from all participants to candidates
5. **Score candidates** by:
   - Travel time variance (50% weight) - fairness
   - Total travel time (30% weight) - efficiency
   - Maximum individual time (20% weight) - no outliers
6. **Search venues** near the best-scoring area
7. **Rank venues** by fairness + relevance

## Project Structure

```
mmitm/
├── backend/
│   ├── src/
│   │   ├── config/         # Environment configuration
│   │   ├── controllers/    # Request handlers
│   │   ├── middleware/     # Express middleware
│   │   ├── routes/         # API route definitions
│   │   ├── services/       # External API integrations
│   │   │   ├── nominatimService.ts
│   │   │   ├── openRouteService.ts
│   │   │   ├── googleMapsService.ts
│   │   │   ├── openaiService.ts
│   │   │   ├── foursquareService.ts
│   │   │   └── timeMiddleAlgorithm.ts
│   │   └── types/          # TypeScript types
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── services/       # API client
│   │   ├── store/          # Zustand store
│   │   └── types/          # TypeScript types
│   └── package.json
│
├── .env.example
└── README.md
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/geocode` | Geocode an address |
| POST | `/api/interpret` | Parse destination intent |
| POST | `/api/find-middle` | Find optimal meeting location |

## Deployment

### Frontend (Vercel)

1. Connect your GitHub repository to Vercel
2. Set build command: `npm run build`
3. Set output directory: `dist`
4. Add environment variable: `VITE_API_URL` = your backend URL

### Backend (Render)

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Set build command: `npm install && npm run build`
4. Set start command: `npm start`
5. Add environment variables from `.env.example`

## Cost Estimate (MVP)

| Service | Monthly Cost |
|---------|-------------|
| Vercel (Frontend) | $0 |
| Render (Backend) | $0 |
| OpenAI (~1000 requests) | ~$0.50 |
| OpenRouteService | $0 |
| Foursquare | $0 |
| Google Maps ($200 credit) | $0 |
| **Total** | **~$0.50/month** |

## Known Limitations

- **Transit accuracy**: Uses Google Maps for transit, which may have limited coverage in some areas
- **Rate limits**: Free tiers have daily/monthly limits - not suitable for high traffic
- **Geocoding speed**: Nominatim has a 1 request/second limit

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

MIT
