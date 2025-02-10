using System.Reactive.Disposables;
using System.Reactive.Linq;

namespace ChatFunctions.Schema;

public static class AsyncEnumerableExtensions
{
    public static IObservable<T> ToObservable<T>(this IAsyncEnumerable<T> source) =>
        Observable.Create<T>(async observer =>
        {
            try
            {
                await foreach (var item in source)
                    observer.OnNext(item);
                observer.OnCompleted();
            }
            catch (Exception ex)
            {
                observer.OnError(ex);
            }
            return Disposable.Create(() => { });
        });
}
