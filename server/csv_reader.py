"""
csv_reader.py — MODE A: NASA C-MAPSS CSV row-by-row replay.

Reads the preprocessed C-MAPSS CSV one row every tick (2 seconds),
maps it through component_mapper, and outputs the exact same JSON schema
as simulator.py so the pipeline cannot distinguish between modes.
"""

import os
import csv
from datetime import datetime, timezone
from component_mapper import map_cmapss_row


class CSVReader:
    """Reads NASA C-MAPSS CSV row by row, outputting standardized readings."""

    def __init__(self, csv_path=None):
        """
        Args:
            csv_path (str): Path to the C-MAPSS CSV file.
                            Defaults to Data/train_FD001.csv from project root.
        """
        if csv_path is None:
            project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            csv_path = os.path.join(project_root, 'Data', 'train_FD001.csv')
        elif not os.path.isabs(csv_path):
            project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            csv_path = os.path.join(project_root, csv_path)

        self.csv_path = csv_path
        self.rows = []
        self.current_index = 0
        self.current_engine_id = None
        self.loaded = False

        self._load_csv()

    def _load_csv(self):
        """Load the entire CSV into memory for sequential replay."""
        try:
            with open(self.csv_path, 'r', newline='') as f:
                reader = csv.DictReader(f)
                self.rows = list(reader)
            self.loaded = True
            self.current_index = 0
            if self.rows:
                self.current_engine_id = self.rows[0].get('engine_id', '1')
            print(f"[OK] CSV loaded: {len(self.rows)} rows from {os.path.basename(self.csv_path)}")
        except FileNotFoundError:
            print(f"[ERROR] CSV file not found: {self.csv_path}")
            self.loaded = False
        except Exception as e:
            print(f"[ERROR] CSV load error: {e}")
            self.loaded = False

    def reset(self):
        """Reset replay to the beginning."""
        self.current_index = 0
        if self.rows:
            self.current_engine_id = self.rows[0].get('engine_id', '1')

    def has_next(self):
        """Check if there are more rows to read."""
        return self.loaded and self.current_index < len(self.rows)

    def read_next(self):
        """
        Read the next CSV row and return mapped component readings.

        Returns:
            list[dict]: Three readings (one per component), same schema as
                        simulator.py output:
                        {component_id, flight_hour, temperature, vibration,
                         rpm, timestamp, cmapss_engine_id, cmapss_cycle}
            Returns None if no more rows.
        """
        if not self.has_next():
            # Loop back to the beginning
            self.current_index = 0
            if not self.has_next():
                return None

        row = self.rows[self.current_index]
        self.current_index += 1

        # Track engine transitions
        engine_id = row.get('engine_id', '1')
        if engine_id != self.current_engine_id:
            self.current_engine_id = engine_id

        # Map through component_mapper → 3 component readings
        readings = map_cmapss_row(row)

        # Add timestamp and mode-specific fields
        timestamp = datetime.now(timezone.utc).isoformat()
        for reading in readings:
            reading['timestamp'] = timestamp

        return readings

    @property
    def progress(self):
        """Return current replay progress as a fraction."""
        if not self.rows:
            return 0.0
        return self.current_index / len(self.rows)

    @property
    def total_rows(self):
        """Total number of rows in the CSV."""
        return len(self.rows)

    @property
    def current_row_index(self):
        """Current position in the CSV."""
        return self.current_index

    def get_current_engine_info(self):
        """Return info about the current engine being replayed."""
        if not self.has_next() and self.current_index == 0:
            return {'engine_id': None, 'cycle': 0}

        idx = max(0, self.current_index - 1)
        if idx < len(self.rows):
            row = self.rows[idx]
            return {
                'engine_id': row.get('engine_id'),
                'cycle': row.get('cycle'),
                'rul': row.get('RUL'),
            }
        return {'engine_id': None, 'cycle': 0}
