FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["api/ChatFunctions/ChatFunctions.csproj", "ChatFunctions/"]
RUN dotnet restore "ChatFunctions/ChatFunctions.csproj" \
    --runtime linux-x64

COPY api/ChatFunctions/. ChatFunctions/
RUN dotnet publish "ChatFunctions/ChatFunctions.csproj" \
    -c Release \
    -o /app/publish \
    --runtime linux-x64 \
    --self-contained false \
    /p:PublishReadyToRun=true

FROM mcr.microsoft.com/azure-functions/dotnet:4-dotnet8.0
ENV AzureWebJobsScriptRoot=/home/site/wwwroot \
    AzureFunctionsJobHost__Logging__Console__IsEnabled=true \
    FUNCTIONS_WORKER_RUNTIME=dotnet \
    DOTNET_ENVIRONMENT=Production \
    FUNCTIONS_INPROC_NET8_ENABLED=true

COPY --from=build /app/publish /home/site/wwwroot
