import sys
import os
import json

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__))))

from app.modules.decision_engine.engine import _evaluate_sub_block
from app.modules.decision_engine.schemas import SubBlockInput, RainEvent, WeatherContext, FieldContext, SubBlockState, RuleProfile, RecommendationType, EvaluateRequest

def get_expected_recommendation(wl: float, has_rule: bool, peak_rain: float, hours_until_rain: float) -> str:
    if not has_rule:
        return RecommendationType.OBSERVE
    
    is_flooded = wl > 7.0
    is_high = wl >= 5.0
    is_critical_dry = wl <= -15.0
    is_dry = wl <= -5.0
    
    is_heavy = peak_rain >= 8.0
    is_imminent = hours_until_rain < 3.0
    is_sustained = peak_rain >= 2.0 and hours_until_rain <= 6.0 # simple sustained logic
    
    if is_flooded:
        if is_heavy:
            return RecommendationType.DRAIN
        else:
            return RecommendationType.DRAIN
            
    elif is_high:
        if is_heavy:
            return RecommendationType.DRAIN
        elif not is_imminent or is_sustained:
            return RecommendationType.DRAIN
            
    elif is_critical_dry:
        return RecommendationType.IRRIGATE
        
    elif is_dry:
        if is_imminent and is_heavy:
            return RecommendationType.OBSERVE
        else:
            return RecommendationType.IRRIGATE
            
    # Normal boundaries (between -5 and 5)
    if is_heavy and is_imminent:
        return RecommendationType.DRAIN
        
    return RecommendationType.OBSERVE

def run_tests():
    # Permutations (15 * 10 * 10 * 2 = 3000 base, let's expand)
    water_levels = [
        -50.0, -15.1, -15.0, -14.9, -10.0, -5.1, -5.0, -4.9, 
        0.0, 4.9, 5.0, 5.1, 6.9, 7.0, 7.1, 9.0, 100.0
    ]
    peak_rains = [0.0, 1.0, 2.0, 7.9, 8.0, 8.1, 15.0, 50.0, 200.0]
    hours_until_rains = [0.0, 1.0, 2.9, 3.0, 3.1, 5.9, 6.0, 6.1, 12.0, 24.0]
    has_rules = [True, False]
    
    total = 0
    passed = 0
    mismatches = []
    
    print("Generating massive permutations for Fuzzing DSS Engine...")
    for wl in water_levels:
        for peak in peak_rains:
            for hrs in hours_until_rains:
                for rule in has_rules:
                    total += 1
                    
                    sub_state = SubBlockState(
                        water_level_cm=wl, 
                        state_source="observed",
                        freshness_status="fresh"
                    )
                    
                    rule_profile = None
                    if rule:
                        rule_profile = RuleProfile(
                            id="rule1",
                            drought_alert_cm=-15.0,
                            awd_lower_threshold_cm=-5.0,
                            awd_upper_target_cm=5.0
                        )
                        
                    sb_input = SubBlockInput(
                        id="test-box",
                        state=sub_state,
                        rule_profile=rule_profile
                    )
                    
                    rain_events = []
                    if peak > 0:
                        rain_events.append(RainEvent(
                            starts_at="2026-01-01T12:00:00Z",
                            ends_at="2026-01-01T15:00:00Z",
                            hours_until_rain=hrs,
                            duration_hours=3,
                            total_mm=peak * 3,
                            peak_intensity_mm=peak,
                            intensity_label="Heavy" if peak >= 8.0 else "Light"
                        ))
                    
                    weather = WeatherContext(rain_events=rain_events)
                    field = FieldContext()
                    
                    request = EvaluateRequest(
                        job_id="job123",
                        field_id="field123",
                        sub_blocks=[sb_input],
                        weather=weather,
                        field_context=field
                    )
                    
                    try:
                        rec = _evaluate_sub_block(sb_input, request)
                        actual = rec.recommendation_type
                    except Exception as e:
                        actual = f"ERROR: {str(e)}"
                        
                    expected = get_expected_recommendation(wl, rule, peak, hrs)
                    
                    if actual == expected:
                        passed += 1
                    else:
                        mismatches.append({
                            "wl": wl,
                            "peak": peak,
                            "hrs": hrs,
                            "has_rule": rule,
                            "expected": expected.value if hasattr(expected, 'value') else expected,
                            "actual": actual.value if hasattr(actual, 'value') else actual,
                            "reason": getattr(rec, 'reason_summary', 'N/A')
                        })
                        
    accuracy = (passed / total) * 100
    
    print(f"\\n--- BLACK BOX TESTING RESULTS ---")
    print(f"Total Scenarios Evaluated: {total}")
    print(f"Passed Expected Output: {passed}")
    print(f"Failed/Mismatches: {len(mismatches)}")
    print(f"Accuracy Score: {accuracy:.2f}%")
    
    with open("blackbox_mismatches.json", "w") as f:
        json.dump(mismatches, f, indent=2)

if __name__ == "__main__":
    run_tests()
