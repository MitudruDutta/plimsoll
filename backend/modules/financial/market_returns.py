# """
# Market returns computation using pandas-datareader.

# Fetches stock data from Stooq and computes return/volatility metrics.
# """

# import logging
# import math
# from datetime import datetime, timedelta

# import pandas as pd
# import pandas_datareader.data as web

# from modules.financial.market_sentinel_schemas import ReturnsSnapshot

# logger = logging.getLogger(__name__)


# def compute_returns_snapshot(symbol: str, days: int = 10) -> ReturnsSnapshot:
#     """
#     Compute market returns snapshot for a given symbol using Stooq data.

#     Args:
#         symbol: Stock symbol (e.g., "^spx" for S&P 500, "^dji" for Dow Jones)
#         days: Number of trading days to analyze

#     Returns:
#         ReturnsSnapshot with return and volatility metrics

#     Raises:
#         ValueError: If no data is available or insufficient data points
#     """
#     end_date = datetime.now()
#     # Fetch extra days to account for weekends/holidays
#     start_date = end_date - timedelta(days=days * 2)

#     logger.info(f"Fetching {symbol} data from {start_date.date()} to {end_date.date()}")

#     # Fetch data from Stooq
#     df = web.DataReader(symbol, "stooq", start_date, end_date)

#     if df.empty:
#         raise ValueError(f"No data returned for symbol: {symbol}")

#     # Sort by date ascending (Stooq returns descending)
#     df = df.sort_index(ascending=True)

#     # Take the requested number of trading days
#     df = df.tail(days)

#     if len(df) < 2:
#         raise ValueError(f"Insufficient data points for {symbol}: got {len(df)}, need at least 2")

#     # Calculate returns
#     start_price = float(df["Close"].iloc[0])
#     end_price = float(df["Close"].iloc[-1])
#     total_return_pct = ((end_price - start_price) / start_price) * 100

#     # Calculate volatility
#     daily_returns = df["Close"].pct_change().dropna()
#     daily_volatility_pct = float(daily_returns.std() * 100)

#     # Annualize volatility (252 trading days)
#     annualized_volatility_pct = daily_volatility_pct * math.sqrt(252)

#     snapshot = ReturnsSnapshot(
#         symbol=symbol,
#         period_days=len(df),
#         start_date=df.index[0].isoformat(),
#         end_date=df.index[-1].isoformat(),
#         start_price=round(start_price, 2),
#         end_price=round(end_price, 2),
#         total_return_pct=round(total_return_pct, 4),
#         daily_volatility_pct=round(daily_volatility_pct, 4),
#         annualized_volatility_pct=round(annualized_volatility_pct, 4),
#     )

#     logger.info(f"Computed returns for {symbol}: {total_return_pct:.2f}% over {len(df)} days")

#     return snapshot


