import numpy as np

def calculate_var(returns, portfolio_value, confidence_level=95):
    var_threshold = np.percentile(returns, 100 - confidence_level)
    return round(var_threshold * portfolio_value, 2)

def calculate_cvar(returns, portfolio_value, confidence_level=95):
    var_threshold = np.percentile(returns, 100 - confidence_level)
    cvar = returns[returns <= var_threshold].mean()
    return round(cvar * portfolio_value, 2)

def calculate_sharpe_ratio(returns, risk_free_rate=0.05):
    excess_returns = returns.mean() - risk_free_rate / 252
    return round(excess_returns / returns.std(), 2)

def calculate_max_drawdown(prices):
    cumulative_max = prices.cummax()
    drawdown = (prices - cumulative_max) / cumulative_max
    return round(drawdown.min(), 4)
