FROM mcr.microsoft.com/dotnet/sdk:8.0-nanoserver-ltsc2022 AS build
WORKDIR C:\\src
COPY ["api/ChatFunctions/ChatFunctions.csproj", "ChatFunctions\\"]
RUN dotnet restore "ChatFunctions\\ChatFunctions.csproj"

COPY api/ChatFunctions/. ChatFunctions/
RUN dotnet publish "ChatFunctions\\ChatFunctions.csproj" \
    -c Release \
    -o C:\\app\\publish \
    --self-contained false \
    /p:PublishReadyToRun=true

FROM mcr.microsoft.com/azure-functions/dotnet:4.0-dotnet8-core-tools-nanoserver-ltsc2022
ENV AzureWebJobsScriptRoot=C:\\home\\site\\wwwroot \
    AzureFunctionsJobHost__Logging__Console__IsEnabled=true \
    FUNCTIONS_WORKER_RUNTIME=dotnet \
    DOTNET_ENVIRONMENT=Production \
    FUNCTIONS_INPROC_NET8_ENABLED=true

COPY --from=build C:\\app\\publish C:\\home\\site\\wwwroot
