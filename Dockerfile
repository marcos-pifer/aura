FROM python:3.12.3-slim

# Set working directory
WORKDIR /app
COPY requirements_prod.txt /app/requirements_prod.txt

# Install dependencies
RUN pip install -r requirements_prod.txt

CMD ["/bin/bash"]