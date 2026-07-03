import os
import sys
import time
import cProfile
import pstats
import io
from django.core.wsgi import get_wsgi_application
from django.db import connection
from django.test import Client

# Initialize Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'task_management.settings')
application = get_wsgi_application()

from core.models import User
from django.test.utils import CaptureQueriesContext

def run_benchmark():
    # Find an admin user
    admin_user = User.objects.filter(role='ADMIN').first()
    if not admin_user:
        print("No admin user found. Please create one.")
        return

    client = Client()
    client.force_login(admin_user)

    endpoints = [
        '/api/dashboard/stats/',
        '/api/tasks/admin/',
        '/api/timesheets/admin/',
        '/api/scorecards/',
        '/api/announcements/',
    ]

    report = []
    report.append("=========================================")
    report.append("         API BENCHMARK REPORT            ")
    report.append("=========================================")

    for endpoint in endpoints:
        print(f"Benchmarking {endpoint}...")
        report.append(f"\nEndpoint: {endpoint}")
        
        # Warmup
        client.get(endpoint)

        # Profile
        pr = cProfile.Profile()
        pr.enable()
        
        start_time = time.time()
        with CaptureQueriesContext(connection) as ctx:
            response = client.get(endpoint)
        end_time = time.time()
        
        pr.disable()
        
        latency_ms = (end_time - start_time) * 1000
        status_code = response.status_code
        query_count = len(ctx.captured_queries)

        report.append(f"Status Code: {status_code}")
        report.append(f"Latency: {latency_ms:.2f} ms")
        report.append(f"SQL Queries: {query_count}")

        # Check for duplicate queries (N+1 indication)
        queries = [q['sql'] for q in ctx.captured_queries]
        unique_queries = set(queries)
        if query_count > 0:
            duplicate_ratio = (query_count - len(unique_queries)) / query_count
            report.append(f"Duplicate Query Ratio: {duplicate_ratio:.1%}")
        
        # Get slow queries
        slow_queries = [q for q in ctx.captured_queries if float(q['time']) > 0.1]
        if slow_queries:
            report.append(f"Slow Queries (>100ms): {len(slow_queries)}")
            for q in slow_queries[:3]:
                report.append(f"  - [{q['time']}s] {q['sql'][:100]}...")

        # Get top profiler stats (e.g. Serializer time)
        s = io.StringIO()
        sortby = pstats.SortKey.CUMULATIVE
        ps = pstats.Stats(pr, stream=s).sort_stats(sortby)
        ps.print_stats(10)
        
        # Extract serializer specific lines if any
        profiler_output = s.getvalue()
        serializer_time = sum([float(line.split()[3]) for line in profiler_output.split('\n') if 'serializers.py' in line and len(line.split()) >= 4])
        report.append(f"Time in serializers.py: {serializer_time:.4f}s")
        
        report.append("-" * 40)

    with open('benchmark_report.txt', 'w') as f:
        f.write('\n'.join(report))
        
    print("Benchmark complete. Report saved to benchmark_report.txt")

if __name__ == '__main__':
    run_benchmark()
