FROM mcr.microsoft.com/dotnet/sdk:7.0 AS build
WORKDIR /src
COPY ["api/ChatFunctions/ChatFunctions.csproj", "ChatFunctions/"]
RUN dotnet restore "ChatFunctions/ChatFunctions.csproj"
COPY api/ChatFunctions/. ChatFunctions/
RUN dotnet build "ChatFunctions/ChatFunctions.csproj" -c Release -o /app/build
RUN dotnet publish "ChatFunctions/ChatFunctions.csproj" -c Release -o /app/publish

FROM mcr.microsoft.com/azure-functions/dotnet-isolated:4-dotnet-isolated7.0
ENV AzureWebJobsScriptRoot=/home/site/wwwroot
ENV AzureFunctionsJobHost__Logging__Console__IsEnabled=true
COPY --from=build /app/publish /home/site/wwwroot
