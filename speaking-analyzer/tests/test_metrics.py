import unittest

from app.main import SpeechSegment, fluency_estimate, interval_metrics, text_metrics


class MetricsTest(unittest.TestCase):
    def test_interval_metrics_merge_segments_and_count_long_pause(self):
        metrics = interval_metrics(
            [
                SpeechSegment(0.0, 2.0, "one", -0.1),
                SpeechSegment(1.8, 3.0, "two", -0.1),
                SpeechSegment(5.0, 8.0, "three", -0.1),
            ],
            10.0,
        )

        self.assertEqual(6.0, metrics["speechSeconds"])
        self.assertEqual(0.6, metrics["speechRatio"])
        self.assertEqual(1, metrics["pauseCount"])
        self.assertEqual(1, metrics["longPauseCount"])

    def test_text_metrics_count_fillers_and_repetitions(self):
        metrics = text_metrics("I, um, really really enjoy learning English.")
        self.assertEqual(7, metrics["wordCount"])
        self.assertEqual(1, metrics["fillerCount"])
        self.assertEqual(1, metrics["repetitionCount"])

    def test_fluency_estimate_rewards_natural_rate_and_continuity(self):
        good = fluency_estimate(
            {
                "wordsPerMinute": 135,
                "speechRatio": 0.9,
                "longPauseCount": 0,
                "fillerCount": 0,
                "wordCount": 150,
            }
        )
        disrupted = fluency_estimate(
            {
                "wordsPerMinute": 55,
                "speechRatio": 0.55,
                "longPauseCount": 4,
                "fillerCount": 8,
                "wordCount": 60,
            }
        )
        self.assertGreater(good, disrupted)
        self.assertGreaterEqual(good, 0.9)


if __name__ == "__main__":
    unittest.main()

