import numpy as np

def calculate_var(returns, portfolio_value, confidence_level=95):
    """Calculate Value at Risk (VaR) - the maximum expected loss"""
    if len(returns) == 0:
        return 0.0
    
    # Convert confidence level to percentile (e.g., 95% -> 5th percentile for losses)
    percentile = 100 - confidence_level
    var_threshold = np.percentile(returns, percentile)
    
    # VaR is the potential loss, so it should be negative
    # Multiply by portfolio value to get absolute loss amount
    var_amount = abs(var_threshold * portfolio_value)
    return round(var_amount, 2)

def calculate_cvar(returns, portfolio_value, confidence_level=95):
    """Calculate Conditional Value at Risk (CVaR) - expected loss beyond VaR"""
    if len(returns) == 0:
        return 0.0
    
    # Get VaR threshold
    percentile = 100 - confidence_level
    var_threshold = np.percentile(returns, percentile)
    
    # CVaR is the mean of returns worse than VaR threshold
    tail_returns = returns[returns <= var_threshold]
    if len(tail_returns) == 0:
        return 0.0
    
    cvar_threshold = tail_returns.mean()
    cvar_amount = abs(cvar_threshold * portfolio_value)
    return round(cvar_amount, 2)

def calculate_sharpe_ratio(returns, risk_free_rate=0.05):
    excess_returns = returns.mean() - risk_free_rate / 252
    return round(excess_returns / returns.std(), 2)

def calculate_max_drawdown(prices):
    cumulative_max = prices.cummax()
    drawdown = (prices - cumulative_max) / cumulative_max
    return round(drawdown.min(), 4)
